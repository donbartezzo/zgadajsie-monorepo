import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { PRE_ENROLLMENT_HOURS } from '@zgadajsie/shared';

@Injectable()
export class EnrollmentLotteryCron {
  private readonly logger = new Logger(EnrollmentLotteryCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleLottery(): Promise<void> {
    const now = new Date();
    const threshold48h = new Date(now.getTime() + PRE_ENROLLMENT_HOURS * 60 * 60 * 1000);

    const eligibleEvents = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        lotteryExecutedAt: null,
        startsAt: { lte: threshold48h },
      },
      select: { id: true, maxParticipants: true, organizerId: true, title: true },
    });

    for (const event of eligibleEvents) {
      try {
        await this.executeLotteryForEvent(event);
      } catch (err) {
        this.logger.error(`Lottery failed for event ${event.id}: ${err}`);
      }
    }
  }

  async executeLotteryForEvent(event: {
    id: string;
    maxParticipants: number;
    organizerId: string;
    title: string;
  }): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic lock - only one cron instance processes this event
      const locked = await tx.event.updateMany({
        where: { id: event.id, lotteryExecutedAt: null },
        data: { lotteryExecutedAt: new Date() },
      });
      if (locked.count === 0) {
        return null; // Already processed by another instance
      }

      const pendingParticipations = await tx.eventParticipation.findMany({
        where: { eventId: event.id, status: 'PENDING' },
        include: {
          user: { select: { id: true, isActive: true } },
        },
      });

      // Separate pre-picks (guaranteed)
      const prePicks = pendingParticipations.filter((p) => p.organizerPicked);
      const nonPicks = pendingParticipations.filter((p) => !p.organizerPicked);

      // Check bans for non-picks
      const banMap = new Map<string, boolean>();
      const uniqueUserIds = [...new Set(nonPicks.map((p) => p.userId))];
      if (uniqueUserIds.length > 0) {
        const bans = await tx.organizerUserRelation.findMany({
          where: {
            organizerUserId: event.organizerId,
            targetUserId: { in: uniqueUserIds },
            isBanned: true,
          },
          select: { targetUserId: true },
        });
        for (const ban of bans) {
          banMap.set(ban.targetUserId, true);
        }
      }

      const unbannedNonPicks = nonPicks.filter((p) => !banMap.get(p.userId));

      // Check "new user" status for tier separation
      const newUserMap = new Map<string, boolean>();
      for (const userId of uniqueUserIds) {
        if (banMap.get(userId)) {
          continue;
        }
        const trusted = await tx.organizerUserRelation.findUnique({
          where: {
            organizerUserId_targetUserId: {
              organizerUserId: event.organizerId,
              targetUserId: userId,
            },
          },
          select: { isTrusted: true },
        });
        if (trusted?.isTrusted) {
          newUserMap.set(userId, false);
          continue;
        }
        const pastCount = await tx.eventParticipation.count({
          where: {
            userId,
            status: { in: ['APPROVED', 'CONFIRMED'] },
            event: {
              organizerId: event.organizerId,
              status: { not: 'CANCELLED' },
              endsAt: { lt: new Date() },
            },
          },
        });
        newUserMap.set(userId, pastCount === 0);
      }

      // 3-tier split: veterans, guests, newcomers
      const veterans = unbannedNonPicks.filter(
        (p) => !p.isGuest && newUserMap.get(p.userId) === false,
      );
      const guests = unbannedNonPicks.filter((p) => p.isGuest);
      const newcomers = unbannedNonPicks.filter(
        (p) => !p.isGuest && newUserMap.get(p.userId) === true,
      );

      let remaining = event.maxParticipants - prePicks.length;
      const selected: string[] = [];

      for (const tier of [veterans, guests, newcomers]) {
        const shuffled = shuffleArray(tier);
        const take = Math.min(remaining, shuffled.length);
        for (let i = 0; i < take; i++) {
          selected.push(shuffled[i].id);
        }
        remaining -= take;
        if (remaining <= 0) {
          break;
        }
      }

      const allApprovedIds = [...prePicks.map((p) => p.id), ...selected];
      const rejectedIds = pendingParticipations
        .filter((p) => !allApprovedIds.includes(p.id))
        .map((p) => p.id);

      const approvedAt = new Date();

      if (allApprovedIds.length > 0) {
        await tx.eventParticipation.updateMany({
          where: { id: { in: allApprovedIds } },
          data: { status: 'APPROVED', approvedAt },
        });
      }

      // Rejected stay PENDING - they can still join in open enrollment
      // (we don't reject them, they just weren't selected)

      return { allApprovedIds, rejectedIds, pendingParticipations };
    });

    if (!result) {
      return; // Already processed
    }

    // Notifications - fire-and-forget, AFTER successful commit
    const { allApprovedIds, pendingParticipations } = result;

    for (const p of pendingParticipations) {
      const isApproved = allApprovedIds.includes(p.id);
      const recipientId = p.isGuest ? p.addedByUserId ?? p.userId : p.userId;

      try {
        if (isApproved) {
          await this.pushService.notifyParticipationStatus(
            recipientId,
            event.title,
            'APPROVED',
            event.id,
          );
        } else {
          await this.pushService.notifyParticipationStatus(
            recipientId,
            event.title,
            'LOTTERY_NOT_SELECTED',
            event.id,
          );
        }
      } catch (err) {
        this.logger.error(
          `Lottery notification failed for user ${recipientId}, event ${event.id}: ${err}`,
        );
      }
    }

    this.logger.log(
      `Lottery completed for event "${event.title}": ${allApprovedIds.length} approved, ` +
        `${pendingParticipations.length - allApprovedIds.length} not selected`,
    );
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
