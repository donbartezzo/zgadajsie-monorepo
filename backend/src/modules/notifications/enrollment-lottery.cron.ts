import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PRE_ENROLLMENT_HOURS, MILLISECONDS_PER_HOUR } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { SlotService } from '../slots/slot.service';

@Injectable()
export class EnrollmentLotteryCron {
  private readonly logger = new Logger(EnrollmentLotteryCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    private slotService: SlotService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleLottery(): Promise<void> {
    const now = new Date();
    const threshold48h = new Date(now.getTime() + PRE_ENROLLMENT_HOURS * MILLISECONDS_PER_HOUR);

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

      // Get all waiting participants (wantsIn=true, no slot)
      const pendingParticipations = await tx.eventParticipation.findMany({
        where: { eventId: event.id, wantsIn: true, slot: null },
        include: {
          user: { select: { id: true, isActive: true } },
        },
      });

      // Check bans
      const banMap = new Map<string, boolean>();
      const uniqueUserIds = [...new Set(pendingParticipations.map((p) => p.userId))];
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

      const unbannedParticipations = pendingParticipations.filter((p) => !banMap.get(p.userId));

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
        // Count past participations with slot (confirmed attendance)
        const pastCount = await tx.eventParticipation.count({
          where: {
            userId,
            slot: { isNot: null },
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
      const veterans = unbannedParticipations.filter(
        (p) => p.addedByUserId === null && newUserMap.get(p.userId) === false,
      );
      const guests = unbannedParticipations.filter((p) => p.addedByUserId !== null);
      const newcomers = unbannedParticipations.filter(
        (p) => p.addedByUserId === null && newUserMap.get(p.userId) === true,
      );

      let remaining = event.maxParticipants;
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

      const allSelectedIds = selected;
      const notSelectedIds = pendingParticipations
        .filter((p) => !allSelectedIds.includes(p.id))
        .map((p) => p.id);

      // Assign slots to selected participants
      const assignedIds: string[] = [];
      for (const participationId of allSelectedIds) {
        // Find a free slot
        const freeSlot = await tx.eventSlot.findFirst({
          where: { eventId: event.id, participationId: null },
        });
        if (freeSlot) {
          await tx.eventSlot.update({
            where: { id: freeSlot.id },
            data: { participationId, assignedAt: new Date() },
          });
          assignedIds.push(participationId);
        }
      }

      // Not selected stay as waiting (wantsIn=true, no slot)
      // They can still get a slot in open enrollment if one becomes free

      return { assignedIds, notSelectedIds, pendingParticipations };
    });

    if (!result) {
      return; // Already processed
    }

    // Notifications - fire-and-forget, AFTER successful commit
    const { assignedIds, pendingParticipations } = result;

    for (const p of pendingParticipations) {
      const gotSlot = assignedIds.includes(p.id);
      const recipientId = p.addedByUserId ?? p.userId;

      try {
        if (gotSlot) {
          await this.pushService.notifyParticipationStatus(
            recipientId,
            event.title,
            'SLOT_ASSIGNED',
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
      `Lottery completed for event "${event.title}": ${assignedIds.length} slots assigned, ` +
        `${pendingParticipations.length - assignedIds.length} waiting`,
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
