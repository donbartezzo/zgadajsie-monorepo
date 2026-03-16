import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { daysFromNow } from '../../common/utils/date.util';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { CreateReprimandDto } from './dto/create-reprimand.dto';
import { CreateBanDto } from './dto/create-ban.dto';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  async createReprimand(fromUserId: string, dto: CreateReprimandDto) {
    const reprimand = await this.prisma.reprimand.create({
      data: {
        fromUserId,
        toUserId: dto.toUserId,
        eventId: dto.eventId,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : daysFromNow(30),
      },
    });

    // Notify reprimanded user
    const [user, event] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.toUserId },
        select: { email: true, displayName: true },
      }),
      this.prisma.event.findUnique({ where: { id: dto.eventId }, select: { title: true } }),
    ]);
    if (user && event) {
      await this.pushService.notifyReprimand(dto.toUserId, event.title, dto.reason, dto.eventId);
      await this.emailService.sendReprimandEmail(
        user.email,
        user.displayName,
        event.title,
        dto.reason,
      );
    }

    return reprimand;
  }

  async getReprimandsByEvent(eventId: string) {
    return this.prisma.reprimand.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });
  }

  async getReprimands(userId: string) {
    return this.prisma.reprimand.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });
  }

  async banUser(organizerUserId: string, dto: CreateBanDto) {
    return this.prisma.organizerUserRelation.upsert({
      where: {
        organizerUserId_targetUserId: {
          organizerUserId,
          targetUserId: dto.userId,
        },
      },
      create: {
        organizerUserId,
        targetUserId: dto.userId,
        isBanned: true,
        note: dto.reason,
      },
      update: {
        isBanned: true,
        note: dto.reason,
      },
    });
  }

  async unbanUser(organizerUserId: string, targetUserId: string) {
    const relation = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId, targetUserId },
      },
    });
    if (!relation) {
      throw new NotFoundException('Relacja nie znaleziona');
    }
    return this.prisma.organizerUserRelation.update({
      where: { id: relation.id },
      data: { isBanned: false },
    });
  }

  async trustUser(organizerUserId: string, targetUserId: string) {
    return this.prisma.organizerUserRelation.upsert({
      where: {
        organizerUserId_targetUserId: { organizerUserId, targetUserId },
      },
      create: {
        organizerUserId,
        targetUserId,
        isTrusted: true,
      },
      update: {
        isTrusted: true,
      },
    });
  }

  async untrustUser(organizerUserId: string, targetUserId: string) {
    const relation = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId, targetUserId },
      },
    });
    if (!relation) {
      throw new NotFoundException('Relacja nie znaleziona');
    }
    return this.prisma.organizerUserRelation.update({
      where: { id: relation.id },
      data: { isTrusted: false },
    });
  }

  async getRelation(organizerUserId: string, targetUserId: string) {
    return this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId, targetUserId },
      },
    });
  }

  async getRelationsForOrganizer(organizerUserId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.organizerUserRelation.findMany({
        where: { organizerUserId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          targetUser: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.organizerUserRelation.count({ where: { organizerUserId } }),
    ]);
    return { data, total, page, limit };
  }

  async isUserBanned(organizerUserId: string, targetUserId: string): Promise<boolean> {
    const relation = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId, targetUserId },
      },
      select: { isBanned: true },
    });
    return relation?.isBanned === true;
  }
}
