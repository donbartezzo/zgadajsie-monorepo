import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  async createBan(organizerUserId: string, dto: CreateBanDto) {
    return this.prisma.organizerBan.create({
      data: {
        organizerUserId,
        bannedUserId: dto.userId,
        reason: dto.reason,
      },
    });
  }

  async removeBan(banId: string) {
    const ban = await this.prisma.organizerBan.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('Ban nie znaleziony');
    return this.prisma.organizerBan.delete({ where: { id: banId } });
  }

  async getBans(page = 1, limit = 20) {
    const [bans, total] = await Promise.all([
      this.prisma.organizerBan.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: { select: { id: true, displayName: true, email: true } },
          bannedUser: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.organizerBan.count(),
    ]);
    return { data: bans, total, page, limit };
  }

  async isUserBanned(organizerUserId: string, bannedUserId: string): Promise<boolean> {
    const ban = await this.prisma.organizerBan.findUnique({
      where: {
        organizerUserId_bannedUserId: { organizerUserId, bannedUserId },
      },
    });
    return !!ban;
  }
}
