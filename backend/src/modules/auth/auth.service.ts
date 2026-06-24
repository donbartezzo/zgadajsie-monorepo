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
import { verifyTurnstile } from '../../common/utils/captcha.util';

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
      const secret = this.configService.getOrThrow<string>('TURNSTILE_SECRET_KEY');
      const outcome = await verifyTurnstile(dto.captchaToken, ipAddress, secret, this.logger);
      if (outcome === 'invalid') {
        this.logger.warn(`Invalid Turnstile token for registration: ${dto.email}`);
        throw new ForbiddenException('Weryfikacja captcha nie powiodła się');
      }
    } else if (featureFlags.enableTurnstileCaptcha) {
      this.logger.warn(
        `Registration without captcha token (captcha unavailable on client): ${dto.email} from ${ipAddress}`,
      );
    }

    const existing = await this.prisma.userRealDetails.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    }

    const passwordHash = await hashPassword(dto.password);
    const activationToken = uuidv4();
    const activationTokenExpiresAt = hoursFromNow(24);

    await this.prisma.user.create({
      data: {
        displayName: dto.displayName,
        realDetails: {
          create: {
            email: dto.email,
            passwordHash,
            activationToken,
            activationTokenExpiresAt,
          },
        },
      },
    });

    await this.sendActivationEmailSafe(dto.email, dto.displayName, activationToken);

    return { message: 'Konto utworzone. Sprawdź email, aby aktywować konto.' };
  }

  private async sendPasswordResetEmailSafe(email: string, token: string): Promise<void> {
    try {
      await this.emailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Wysyłka maila aktywacyjnego jest best-effort: jej błąd (np. render szablonu
   * albo niedostępny dostawca) NIE może przerywać rejestracji ani zostawiać konta
   * w stanie 500-bez-maila. Konto już istnieje, a użytkownik ma „wyślij ponownie".
   */
  private async sendActivationEmailSafe(
    email: string,
    displayName: string,
    token: string,
  ): Promise<void> {
    try {
      await this.emailService.sendActivationEmail(email, displayName, token);
    } catch (error) {
      this.logger.error(`Failed to send activation email to ${email}: ${(error as Error).message}`);
    }
  }

  async login(dto: LoginDto) {
    const details = await this.prisma.userRealDetails.findUnique({
      where: { email: dto.email },
      include: { user: true },
    });
    if (!details || !details.passwordHash) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    const isPasswordValid = await comparePassword(dto.password, details.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    const { user } = details;
    const tokens = await this.generateTokens(user.id, details.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: details.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async refreshToken(userId: string, _email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { realDetails: true },
    });
    if (!user) {
      throw new UnauthorizedException('Użytkownik nie istnieje');
    }
    return this.generateTokens(user.id, user.realDetails?.email ?? _email);
  }

  async activateAccount(token: string) {
    const details = await this.prisma.userRealDetails.findFirst({
      where: {
        activationToken: token,
        activationTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!details) {
      throw new BadRequestException('Nieprawidłowy lub wygasły token aktywacyjny');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: details.userId },
        data: { isActive: true },
      }),
      this.prisma.userRealDetails.update({
        where: { userId: details.userId },
        data: {
          isEmailVerified: true,
          activationToken: null,
          activationTokenExpiresAt: null,
        },
      }),
    ]);

    return { message: 'Konto zostało aktywowane' };
  }

  async resendActivation(email: string) {
    const details = await this.prisma.userRealDetails.findUnique({
      where: { email },
      include: { user: true },
    });
    if (!details) {
      return { message: 'Jeśli konto istnieje, link aktywacyjny został wysłany' };
    }
    if (details.user.isActive) {
      return { message: 'Konto jest już aktywne' };
    }

    const activationToken = uuidv4();
    const activationTokenExpiresAt = hoursFromNow(24);

    await this.prisma.userRealDetails.update({
      where: { userId: details.userId },
      data: { activationToken, activationTokenExpiresAt },
    });

    await this.sendActivationEmailSafe(details.email, details.user.displayName, activationToken);

    return { message: 'Jeśli konto istnieje, link aktywacyjny został wysłany' };
  }

  async forgotPassword(email: string) {
    const details = await this.prisma.userRealDetails.findUnique({ where: { email } });
    if (details) {
      const passwordResetToken = uuidv4();
      const passwordResetTokenExpiresAt = new Date(Date.now() + MILLISECONDS_PER_HOUR);

      await this.prisma.userRealDetails.update({
        where: { userId: details.userId },
        data: { passwordResetToken, passwordResetTokenExpiresAt },
      });

      await this.sendPasswordResetEmailSafe(details.email, passwordResetToken);
    }

    return { message: 'Jeśli konto istnieje, link do resetu hasła został wysłany' };
  }

  async resetPassword(token: string, newPassword: string) {
    const details = await this.prisma.userRealDetails.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!details) {
      throw new BadRequestException('Nieprawidłowy lub wygasły token resetu hasła');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.userRealDetails.update({
      where: { userId: details.userId },
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
      include: { user: { include: { realDetails: true } } },
    });

    if (socialAccount) {
      return this.generateTokens(
        socialAccount.user.id,
        socialAccount.user.realDetails?.email ?? profile.email,
      );
    }

    const existingDetails = await this.prisma.userRealDetails.findUnique({
      where: { email: profile.email },
    });

    let userId: string;
    if (existingDetails) {
      userId = existingDetails.userId;
    } else {
      const created = await this.prisma.user.create({
        data: {
          displayName: profile.displayName,
          isActive: true,
          realDetails: {
            create: {
              email: profile.email,
              isEmailVerified: true,
            },
          },
        },
      });
      userId = created.id;
    }

    await this.prisma.socialAccount.create({
      data: {
        userId,
        provider: profile.provider as SocialProvider,
        providerUserId: profile.providerUserId,
      },
    });

    return this.generateTokens(userId, profile.email);
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
}
