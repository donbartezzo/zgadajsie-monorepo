import { Injectable, BadRequestException } from '@nestjs/common';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        donationUrl: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.displayName) data.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.email) data.email = dto.email;
    if (dto.donationUrl !== undefined) data.donationUrl = dto.donationUrl || null;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Podaj aktualne hasło');
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.passwordHash) {
        throw new BadRequestException('Konto nie ma ustawionego hasła');
      }
      const valid = await comparePassword(dto.currentPassword, user.passwordHash);
      if (!valid) {
        throw new BadRequestException('Nieprawidłowe aktualne hasło');
      }
      data.passwordHash = await hashPassword(dto.newPassword);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        donationUrl: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
      },
    });
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
  }) {
    const { page = 1, limit = 20, search, role, isActive } = params;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    const data: Record<string, unknown> = {};
    if (dto.displayName) data.displayName = dto.displayName;
    if (dto.role) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const user = await this.prisma.user.update({ where: { id }, data });

    return user;
  }
}
