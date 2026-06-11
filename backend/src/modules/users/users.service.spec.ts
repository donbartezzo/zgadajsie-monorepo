import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import * as passwordUtil from '../../common/utils/password.util';

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userRealDetails: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
    eventEnrollment: {
      findMany: jest.fn(),
    },
    reprimand: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;
}

// Kształt zwracany przez prisma.user.findUnique/update z nowym selectem (pola REAL w realDetails).
const baseUser = {
  id: 'user1',
  displayName: 'Test User',
  role: 'USER',
  isActive: true,
  createdAt: new Date(),
  realDetails: {
    email: 'user@example.com',
    donationUrl: null,
    isEmailVerified: true,
    welcomeMessage: null,
    welcomeMessageEnabled: true,
  },
};

// Spłaszczony kształt zwracany przez getMe/updateProfile (zachowany kontrakt API).
const flattenedUser = {
  id: 'user1',
  displayName: 'Test User',
  role: 'USER',
  isActive: true,
  createdAt: baseUser.createdAt,
  email: 'user@example.com',
  donationUrl: null,
  isEmailVerified: true,
  welcomeMessage: null,
  welcomeMessageEnabled: true,
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new UsersService(prisma as PrismaService);
    jest.clearAllMocks();
  });

  describe('getMe()', () => {
    it('zwraca dane zalogowanego użytkownika', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

      const result = await service.getMe('user1');

      expect(prisma.user.findUnique as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: expect.objectContaining({
          displayName: true,
          realDetails: { select: expect.objectContaining({ email: true }) },
        }),
      });
      expect(result).toEqual(flattenedUser);
    });

    it('nie zwraca pola password w zapytaniu (select bez passwordHash)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

      await service.getMe('user1');

      const call = (prisma.user.findUnique as jest.Mock).mock.calls[0][0];
      expect(call.select).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateProfile()', () => {
    it('zapisuje zmienione pola', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...baseUser,
        displayName: 'New Name',
      });

      await service.updateProfile('user1', { displayName: 'New Name' });

      const call = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(call.data.displayName).toBe('New Name');
    });

    it('rzuca BadRequestException gdy newPassword podane bez currentPassword', async () => {
      await expect(service.updateProfile('user1', { newPassword: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException gdy currentPassword nieprawidłowe', async () => {
      (prisma.userRealDetails.findUnique as jest.Mock).mockResolvedValue({
        passwordHash: 'hashed',
      });
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.updateProfile('user1', {
          currentPassword: 'WrongPass',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('zmienia hasło przy poprawnym currentPassword', async () => {
      (prisma.userRealDetails.findUnique as jest.Mock).mockResolvedValue({
        passwordHash: 'hashed',
      });
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('new-hashed');
      (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);

      await service.updateProfile('user1', {
        currentPassword: 'CorrectPass123!',
        newPassword: 'NewPass123!',
      });

      const call = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(call.data.realDetails.update.passwordHash).toBe('new-hashed');
    });
  });

  describe('adminUpdate()', () => {
    it('może zmieniać role i status użytkownika', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...baseUser, role: 'ADMIN' });

      await service.adminUpdate('user1', { role: 'ADMIN', isActive: true });

      const call = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(call.data.role).toBe('ADMIN');
      expect(call.data.isActive).toBe(true);
    });
  });
});
