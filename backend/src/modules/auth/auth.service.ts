import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const activationToken = uuidv4();
    const activationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        activationToken,
        activationTokenExpiresAt,
      },
    });

    await this.prisma.wallet.create({ data: { userId: user.id } });

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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
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
        avatarUrl: user.avatarUrl,
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
    const activationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

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
      const passwordResetTokenExpiresAt = new Date(
        Date.now() + 60 * 60 * 1000,
      );

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

    const passwordHash = await bcrypt.hash(newPassword, 10);
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
    avatarUrl?: string;
    provider: string;
  }) {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (socialAccount) {
      return this.generateTokens(
        socialAccount.user.id,
        socialAccount.user.email,
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          isActive: true,
          isEmailVerified: true,
        },
      });
      await this.prisma.wallet.create({ data: { userId: user.id } });
    }

    await this.prisma.socialAccount.create({
      data: {
        userId: user.id,
        provider: profile.provider,
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
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
