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
        eventId: dto.eventId ?? null,
        reason: dto.reason,
        type: dto.type ?? 'REPRIMAND',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : daysFromNow(30),
      },
    });

    const eventTitle = dto.eventId
      ? await this.prisma.event
          .findUnique({ where: { id: dto.eventId }, select: { title: true } })
          .then((e) => e?.title ?? '')
      : '';

    const user = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
      select: { email: true, displayName: true },
    });

    if (user) {
      await this.pushService.notifyReprimand(
        dto.toUserId,
        eventTitle,
        dto.reason,
        dto.eventId ?? '',
      );
      if (dto.eventId) {
        await this.emailService.sendReprimandEmail(
          user.email,
          user.displayName,
          eventTitle,
          dto.reason,
        );
      }
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
    // 1. Record the ban as a Reprimand of type BAN
    await this.prisma.reprimand.create({
      data: {
        fromUserId: organizerUserId,
        toUserId: dto.userId,
        eventId: null,
        reason: dto.reason,
        type: 'BAN',
        expiresAt: null,
      },
    });

    // 2. Set isBanned flag in OrganizerUserRelation
    await this.prisma.organizerUserRelation.upsert({
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

    // 3. Find all organizer's events where this user has an active slot, release them
    const activeParticipations = await this.prisma.eventParticipation.findMany({
      where: {
        userId: dto.userId,
        wantsIn: true,
        event: { organizerId: organizerUserId, status: 'ACTIVE' },
      },
      include: { slot: true },
    });

    for (const participation of activeParticipations) {
      if (participation.slot) {
        // Release the slot
        await this.prisma.eventSlot.update({
          where: { id: participation.slot.id },
          data: { participationId: null, assignedAt: null, confirmed: false },
        });
      }
      // Mark as BANNED in waitingReason
      await this.prisma.eventParticipation.update({
        where: { id: participation.id },
        data: { waitingReason: 'BANNED' },
      });
    }

    // 4. Notify user
    await this.pushService
      .notifyReprimand(dto.userId, '', dto.reason, '')
      .catch(() => undefined);

    return { success: true };
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

    // 1. Clear isBanned flag
    await this.prisma.organizerUserRelation.update({
      where: { id: relation.id },
      data: { isBanned: false },
    });

    // 2. Clear waitingReason=BANNED from active participations with this organizer
    await this.prisma.eventParticipation.updateMany({
      where: {
        userId: targetUserId,
        wantsIn: true,
        waitingReason: 'BANNED',
        event: { organizerId: organizerUserId, status: 'ACTIVE' },
      },
      data: { waitingReason: null },
    });

    return { success: true };
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
