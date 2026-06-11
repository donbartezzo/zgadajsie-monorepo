import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AccountType } from '@zgadajsie/shared';

// Pola REAL-only (email, hasło, organizator) żyją w UserRealDetails (1:1).
// Helper spłaszcza je z powrotem na obiekt usera, by zachować kształt API.
const REAL_DETAILS_SELECT = {
  email: true,
  donationUrl: true,
  isEmailVerified: true,
  welcomeMessage: true,
  welcomeMessageEnabled: true,
} as const;

type RealDetailsShape = {
  email?: string | null;
  donationUrl?: string | null;
  isEmailVerified?: boolean | null;
  welcomeMessage?: string | null;
  welcomeMessageEnabled?: boolean | null;
};

function flattenRealDetails<T extends { realDetails: RealDetailsShape | null }>(user: T) {
  const { realDetails, ...rest } = user;
  return {
    ...rest,
    email: realDetails?.email ?? null,
    donationUrl: realDetails?.donationUrl ?? null,
    isEmailVerified: realDetails?.isEmailVerified ?? false,
    welcomeMessage: realDetails?.welcomeMessage ?? null,
    welcomeMessageEnabled: realDetails?.welcomeMessageEnabled ?? true,
  };
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarSeed: true,
        role: true,
        isActive: true,
        createdAt: true,
        realDetails: { select: REAL_DETAILS_SELECT },
      },
    });
    return user ? flattenRealDetails(user) : null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const userData: Prisma.UserUpdateInput = {};
    const realData: Prisma.UserRealDetailsUpdateInput = {};
    if (dto.displayName) userData.displayName = dto.displayName;
    if (dto.avatarSeed !== undefined) userData.avatarSeed = dto.avatarSeed ?? null;
    if (dto.email) realData.email = dto.email;
    if (dto.donationUrl !== undefined) realData.donationUrl = dto.donationUrl || null;
    if (dto.welcomeMessage !== undefined) realData.welcomeMessage = dto.welcomeMessage ?? null;
    if (dto.welcomeMessageEnabled !== undefined)
      realData.welcomeMessageEnabled = dto.welcomeMessageEnabled;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Podaj aktualne hasło');
      }
      const details = await this.prisma.userRealDetails.findUnique({ where: { userId } });
      if (!details?.passwordHash) {
        throw new BadRequestException('Konto nie ma ustawionego hasła');
      }
      const valid = await comparePassword(dto.currentPassword, details.passwordHash);
      if (!valid) {
        throw new BadRequestException('Nieprawidłowe aktualne hasło');
      }
      realData.passwordHash = await hashPassword(dto.newPassword);
    }

    const hasRealData = Object.keys(realData).length > 0;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        ...(hasRealData ? { realDetails: { update: realData } } : {}),
      },
      select: {
        id: true,
        displayName: true,
        avatarSeed: true,
        role: true,
        isActive: true,
        realDetails: { select: REAL_DETAILS_SELECT },
      },
    });
    return flattenRealDetails(user);
  }

  async getMyEvents(userId: string) {
    return this.prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { startsAt: 'desc' },
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async getMyParticipations(userId: string) {
    return this.prisma.eventEnrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          include: { discipline: true, city: true },
        },
      },
    });
  }

  async getMyReprimands(userId: string) {
    return this.prisma.reprimand.findMany({
      where: { toUserId: userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { fromUser: { select: { displayName: true } }, event: { select: { title: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    accountType?: AccountType;
  }) {
    const { page = 1, limit = 20, search, role, isActive, accountType } = params;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { realDetails: { email: { contains: search, mode: 'insensitive' } } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role as Prisma.UserWhereInput['role'];
    if (isActive !== undefined) where.isActive = isActive;
    if (accountType) where.accountType = accountType;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          realDetails: { select: { email: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map(({ realDetails, ...rest }) => ({
      ...rest,
      email: realDetails?.email ?? null,
    }));

    return { data, total, page, limit };
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    const userData: Prisma.UserUpdateInput = {};
    const realData: Prisma.UserRealDetailsUpdateInput = {};
    if (dto.displayName) userData.displayName = dto.displayName;
    if (dto.role) userData.role = dto.role as Prisma.UserUpdateInput['role'];
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;
    if (dto.isEmailVerified !== undefined) {
      realData.isEmailVerified = dto.isEmailVerified;
      // If verifying email, also activate account and clear token
      if (dto.isEmailVerified) {
        userData.isActive = true;
        realData.activationToken = null;
        realData.activationTokenExpiresAt = null;
      }
    }

    const hasRealData = Object.keys(realData).length > 0;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(hasRealData ? { realDetails: { update: realData } } : {}),
      },
    });
  }

  async verifyUserByOrganizer(targetUserId: string, _organizerUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isActive: true, realDetails: { select: { isEmailVerified: true } } },
    });

    if (!targetUser) {
      throw new BadRequestException('Użytkownik nie istnieje');
    }

    if (targetUser.isActive && targetUser.realDetails?.isEmailVerified) {
      throw new BadRequestException('Konto jest już aktywne i zweryfikowane');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: true,
        realDetails: {
          update: {
            isEmailVerified: true,
            activationToken: null,
            activationTokenExpiresAt: null,
          },
        },
      },
      select: {
        id: true,
        displayName: true,
        isActive: true,
        realDetails: { select: { email: true, isEmailVerified: true } },
      },
    });

    const { realDetails, ...rest } = updatedUser;
    return {
      ...rest,
      email: realDetails?.email ?? null,
      isEmailVerified: realDetails?.isEmailVerified ?? false,
    };
  }
}
