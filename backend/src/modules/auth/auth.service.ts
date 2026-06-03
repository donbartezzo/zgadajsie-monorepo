import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { MILLISECONDS_PER_HOUR, SocialProvider } from '@zgadajsie/shared';
import { hoursFromNow } from '../../common/utils/date.util';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { featureFlags } from '../../common/config/feature-flags';

const TIME_TRAP_MIN_SECONDS = 3;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string) {
    if (dto.website || dto.company) {
      this.logger.warn(`Registration honeypot triggered: ${dto.email} from ${ipAddress}`);
      return { message: 'Konto utworzone. Sprawdź email, aby aktywować konto.' };
    }

    if (dto.formRenderedAt) {
      const renderedAt = new Date(dto.formRenderedAt);
      const now = new Date();
      const diffSeconds = (now.getTime() - renderedAt.getTime()) / 1000;

      if (diffSeconds < TIME_TRAP_MIN_SECONDS) {
        this.logger.warn(
          `Registration time-trap triggered: ${dto.email} from ${ipAddress} (${diffSeconds}s)`,
        );
        throw new BadRequestException('Formularz został wypełniony zbyt szybko');
      }
    }

    // Captcha jest best-effort: weryfikujemy tylko gdy klient dostarczył token.
    // Gdy token jest nieobecny (captcha nie załadowała się po stronie klienta),
    // przepuszczamy formularz — ochronę zapewniają honeypot, time-trap i rate-limit.
    if (featureFlags.enableTurnstileCaptcha && dto.captchaToken) {
      const isValid = await this.verifyTurnstile(dto.captchaToken, ipAddress);
      if (!isValid) {
        this.logger.warn(`Invalid Turnstile token for registration: ${dto.email}`);
        throw new ForbiddenException('Weryfikacja captcha nie powiodła się');
      }
    } else if (featureFlags.enableTurnstileCaptcha) {
      this.logger.warn(
        `Registration without captcha token (captcha unavailable on client): ${dto.email} from ${ipAddress}`,
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    }

    const passwordHash = await hashPassword(dto.password);
    const activationToken = uuidv4();
    const activationTokenExpiresAt = hoursFromNow(24);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        activationToken,
        activationTokenExpiresAt,
      },
    });

    await this.emailService.sendActivationEmail(user.email, user.displayName, activationToken);

    return { message: 'Konto utworzone. Sprawdź email, aby aktywować konto.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async refreshToken(userId: string, _email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Użytkownik nie istnieje');
    }
    return this.generateTokens(user.id, user.email);
  }

  async activateAccount(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        activationToken: token,
        activationTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Nieprawidłowy lub wygasły token aktywacyjny');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        isEmailVerified: true,
        activationToken: null,
        activationTokenExpiresAt: null,
      },
    });

    return { message: 'Konto zostało aktywowane' };
  }

  async resendActivation(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'Jeśli konto istnieje, link aktywacyjny został wysłany' };
    }
    if (user.isActive) {
      return { message: 'Konto jest już aktywne' };
    }

    const activationToken = uuidv4();
    const activationTokenExpiresAt = hoursFromNow(24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { activationToken, activationTokenExpiresAt },
    });

    await this.emailService.sendActivationEmail(user.email, user.displayName, activationToken);

    return { message: 'Jeśli konto istnieje, link aktywacyjny został wysłany' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const passwordResetToken = uuidv4();
      const passwordResetTokenExpiresAt = new Date(Date.now() + MILLISECONDS_PER_HOUR);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken, passwordResetTokenExpiresAt },
      });

      await this.emailService.sendPasswordResetEmail(user.email, passwordResetToken);
    }

    return { message: 'Jeśli konto istnieje, link do resetu hasła został wysłany' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Nieprawidłowy lub wygasły token resetu hasła');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { message: 'Hasło zostało zmienione' };
  }

  async validateSocialUser(profile: {
    providerUserId: string;
    email: string;
    displayName: string;
    provider: SocialProvider;
  }) {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider as SocialProvider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (socialAccount) {
      return this.generateTokens(socialAccount.user.id, socialAccount.user.email);
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          isActive: true,
          isEmailVerified: true,
        },
      });
    }

    await this.prisma.socialAccount.create({
      data: {
        userId: user.id,
        provider: profile.provider as SocialProvider,
        providerUserId: profile.providerUserId,
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
    const secret = this.configService.getOrThrow<string>('TURNSTILE_SECRET_KEY');

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: remoteIp,
        }),
      });

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      this.logger.error(`Turnstile verification error: ${error.message}`);
      return false;
    }
  }
}
