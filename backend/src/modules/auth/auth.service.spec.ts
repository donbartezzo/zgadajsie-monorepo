import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuthService } from './auth.service';
import { SocialProvider } from '@zgadajsie/shared';
import * as passwordUtil from '../../common/utils/password.util';

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    socialAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;
}

function buildJwtMock() {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
  } as unknown as JwtService;
}

function buildConfigMock() {
  return {
    get: jest.fn().mockReturnValue('test-value'),
    getOrThrow: jest.fn().mockReturnValue('test-value'),
  } as unknown as ConfigService;
}

function buildEmailMock() {
  return {
    sendActivationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
}

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  passwordHash: 'hashed-password',
  avatarUrl: null,
  role: 'USER',
  isActive: true,
  isEmailVerified: true,
  activationToken: null,
  activationTokenExpiresAt: null,
  passwordResetToken: null,
  passwordResetTokenExpiresAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwt: ReturnType<typeof buildJwtMock>;
  let email: ReturnType<typeof buildEmailMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = buildJwtMock();
    email = buildEmailMock();
    service = new AuthService(
      prisma as PrismaService,
      jwt as JwtService,
      buildConfigMock() as ConfigService,
      email as EmailService,
    );
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('rejestruje użytkownika z poprawnymi danymi', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed');

      const result = await service.register({
        email: 'user@example.com',
        password: 'Test123!',
        displayName: 'Test User',
      });

      expect(prisma.user.create as jest.Mock).toHaveBeenCalled();
      expect(email.sendActivationEmail as jest.Mock).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('odrzuca zduplikowany email (ConflictException)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

      await expect(
        service.register({ email: 'user@example.com', password: 'Test123!', displayName: 'X' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashuje hasło przed zapisem (plain text nie trafia do DB)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);
      const hashSpy = jest
        .spyOn(passwordUtil, 'hashPassword')
        .mockResolvedValue('hashed-value');

      await service.register({
        email: 'user@example.com',
        password: 'PlainText123!',
        displayName: 'User',
      });

      expect(hashSpy).toHaveBeenCalledWith('PlainText123!');
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.passwordHash).toBe('hashed-value');
    });

    it('wysyła email aktywacyjny po rejestracji', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed');

      await service.register({
        email: 'user@example.com',
        password: 'Test123!',
        displayName: 'User',
      });

      expect(email.sendActivationEmail as jest.Mock).toHaveBeenCalledWith(
        baseUser.email,
        baseUser.displayName,
        expect.any(String),
      );
    });

    it('tworzy token aktywacyjny z datą wygaśnięcia (24h)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed');

      await service.register({
        email: 'user@example.com',
        password: 'Test123!',
        displayName: 'User',
      });

      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.activationToken).toBeDefined();
      expect(createCall.data.activationTokenExpiresAt).toBeDefined();
      const expires = new Date(createCall.data.activationTokenExpiresAt);
      const hoursUntilExpiry = (expires.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursUntilExpiry).toBeGreaterThan(23);
      expect(hoursUntilExpiry).toBeLessThan(25);
    });
  });

  describe('login()', () => {
    it('zwraca access + refresh token + user object przy poprawnych danych', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      (jwt.signAsync as jest.Mock).mockResolvedValue('test-token');

      const result = await service.login({
        email: 'user@example.com',
        password: 'Test123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(baseUser.email);
      expect(result.user.isActive).toBe(true);
    });

    it('rzuca UnauthorizedException dla złego hasła', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rzuca UnauthorizedException dla nieistniejącego użytkownika', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'Test123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rzuca UnauthorizedException dla konta bez hasła (social login only)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        passwordHash: null,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'Test123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nie ujawnia czy konto istnieje (ten sam komunikat dla obu błędów)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      let errorForMissing: Error | null = null;
      try {
        await service.login({ email: 'nobody@example.com', password: 'Test' });
      } catch (e) {
        errorForMissing = e as Error;
      }

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      let errorForWrongPass: Error | null = null;
      try {
        await service.login({ email: 'user@example.com', password: 'wrong' });
      } catch (e) {
        errorForWrongPass = e as Error;
      }

      expect(errorForMissing?.message).toBe(errorForWrongPass?.message);
    });

    it('zwraca isActive w obiekcie user (frontend używa do redirect)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        isActive: false,
      });
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      (jwt.signAsync as jest.Mock).mockResolvedValue('token');

      const result = await service.login({
        email: 'user@example.com',
        password: 'Test123!',
      });

      expect(result.user.isActive).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    it('zwraca nowe access + refresh tokeny przy ważnym userId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      (jwt.signAsync as jest.Mock).mockResolvedValue('new-token');

      const result = await service.refreshToken('user-1', 'user@example.com');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('rzuca UnauthorizedException dla nieistniejącego userId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshToken('nonexistent', 'user@example.com'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('activateAccount()', () => {
    it('aktywuje konto z poprawnym tokenem (isActive=true, isEmailVerified=true)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...baseUser,
        isActive: true,
        isEmailVerified: true,
      });

      const result = await service.activateAccount('valid-token');

      expect(prisma.user.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: {
          isActive: true,
          isEmailVerified: true,
          activationToken: null,
          activationTokenExpiresAt: null,
        },
      });
      expect(result.message).toBeDefined();
    });

    it('rzuca BadRequestException dla nieistniejącego tokenu', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.activateAccount('bad-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendActivation()', () => {
    it('tworzy nowy token i wysyła email dla nieaktywnego konta', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        isActive: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.resendActivation('user@example.com');

      expect(email.sendActivationEmail as jest.Mock).toHaveBeenCalled();
      expect(prisma.user.update as jest.Mock).toHaveBeenCalled();
    });

    it('zwraca bezpieczny komunikat dla nieistniejącego emaila', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.resendActivation('nobody@example.com');

      expect(result.message).toContain('Jeśli konto istnieje');
      expect(email.sendActivationEmail as jest.Mock).not.toHaveBeenCalled();
    });

    it('zwraca informację "konto już aktywne" dla aktywnego konta', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, isActive: true });

      const result = await service.resendActivation('user@example.com');

      expect(result.message).toContain('aktywne');
      expect(email.sendActivationEmail as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword()', () => {
    it('tworzy token resetowania i wysyła email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.forgotPassword('user@example.com');

      expect(email.sendPasswordResetEmail as jest.Mock).toHaveBeenCalled();
      expect(prisma.user.update as jest.Mock).toHaveBeenCalled();
    });

    it('nie ujawnia czy email istnieje w bazie (bezpieczeństwo)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('Jeśli konto istnieje');
      expect(email.sendPasswordResetEmail as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword()', () => {
    it('resetuje hasło przy ważnym tokenie', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('new-hash');

      const result = await service.resetPassword('valid-token', 'NewPassword123!');

      expect(prisma.user.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: {
          passwordHash: 'new-hash',
          passwordResetToken: null,
          passwordResetTokenExpiresAt: null,
        },
      });
      expect(result.message).toBeDefined();
    });

    it('rzuca BadRequestException dla wygasłego tokenu resetowania', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('expired-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('unieważnia token po użyciu (passwordResetToken=null)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(baseUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('new-hash');

      await service.resetPassword('valid-token', 'NewPassword123!');

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toBeNull();
    });
  });

  describe('validateSocialUser()', () => {
    it('zwraca tokeny dla istniejącego konta social', async () => {
      (prisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        user: baseUser,
      });
      (jwt.signAsync as jest.Mock).mockResolvedValue('social-token');

      const result = await service.validateSocialUser({
        providerUserId: 'google-123',
        email: 'user@example.com',
        displayName: 'Test User',
        provider: SocialProvider.GOOGLE,
      });

      expect(result.accessToken).toBeDefined();
    });

    it('aktualizuje avatarUrl jeśli się zmienił', async () => {
      (prisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        user: { ...baseUser, avatarUrl: 'old-url' },
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (jwt.signAsync as jest.Mock).mockResolvedValue('token');

      await service.validateSocialUser({
        providerUserId: 'google-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: 'new-url',
        provider: SocialProvider.GOOGLE,
      });

      expect(prisma.user.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { avatarUrl: 'new-url' },
      });
    });

    it('tworzy nowe konto + social account dla nowego użytkownika', async () => {
      (prisma.socialAccount.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...baseUser,
        isActive: true,
      });
      (prisma.socialAccount.create as jest.Mock).mockResolvedValue({});
      (jwt.signAsync as jest.Mock).mockResolvedValue('token');

      await service.validateSocialUser({
        providerUserId: 'google-new',
        email: 'new@example.com',
        displayName: 'New User',
        provider: SocialProvider.GOOGLE,
      });

      expect(prisma.user.create as jest.Mock).toHaveBeenCalled();
      expect(prisma.socialAccount.create as jest.Mock).toHaveBeenCalled();
    });

    it('nowy użytkownik social jest automatycznie aktywny (isActive=true)', async () => {
      (prisma.socialAccount.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ ...baseUser, isActive: true });
      (prisma.socialAccount.create as jest.Mock).mockResolvedValue({});
      (jwt.signAsync as jest.Mock).mockResolvedValue('token');

      await service.validateSocialUser({
        providerUserId: 'google-new',
        email: 'new@example.com',
        displayName: 'New User',
        provider: SocialProvider.GOOGLE,
      });

      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.isActive).toBe(true);
    });

    it('linkuje social account do istniejącego konta (ten sam email)', async () => {
      (prisma.socialAccount.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      (prisma.socialAccount.create as jest.Mock).mockResolvedValue({});
      (jwt.signAsync as jest.Mock).mockResolvedValue('token');

      await service.validateSocialUser({
        providerUserId: 'google-existing',
        email: baseUser.email,
        displayName: 'Test User',
        provider: SocialProvider.GOOGLE,
      });

      expect(prisma.user.create as jest.Mock).not.toHaveBeenCalled();
      expect(prisma.socialAccount.create as jest.Mock).toHaveBeenCalled();
    });
  });
});
