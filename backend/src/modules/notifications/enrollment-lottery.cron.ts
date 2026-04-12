import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PRE_ENROLLMENT_HOURS, MILLISECONDS_PER_HOUR } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';

@Injectable()
export class EnrollmentLotteryCron {
  private readonly logger = new Logger(EnrollmentLotteryCron.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private eventRealtime: EventRealtimeService,
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
      // Atomic lock — only one cron instance processes this event
      const locked = await tx.event.updateMany({
        where: { id: event.id, lotteryExecutedAt: null },
        data: { lotteryExecutedAt: new Date() },
      });
      if (locked.count === 0) {
        return null; // Already processed by another instance
      }

      // Only real users (no guests) in the waiting list
      const pendingParticipations = await tx.eventParticipation.findMany({
        where: { eventId: event.id, wantsIn: true, slot: null, addedByUserId: null },
      });

      if (pendingParticipations.length === 0) {
        return { assignedIds: [], eligible: [] };
      }

      const uniqueUserIds = [...new Set(pendingParticipations.map((p) => p.userId))];

      // Fetch trust and ban relations in one batch query
      const relations = await tx.organizerUserRelation.findMany({
        where: {
          organizerUserId: event.organizerId,
          targetUserId: { in: uniqueUserIds },
        },
        select: { targetUserId: true, isTrusted: true, isBanned: true },
      });
      const relationMap = new Map(relations.map((r) => [r.targetUserId, r]));

      // Lottery is open only to trusted, non-banned participants
      const eligible = pendingParticipations.filter((p) => {
        const rel = relationMap.get(p.userId);
        return rel?.isTrusted === true && rel?.isBanned !== true;
      });

      const shuffled = shuffleArray(eligible);
      const assignedIds: string[] = [];

      for (const participation of shuffled) {
        const freeSlot = await tx.eventSlot.findFirst({
          where: { eventId: event.id, participationId: null },
        });
        if (!freeSlot) break;
        await tx.eventSlot.update({
          where: { id: freeSlot.id },
          data: { participationId: participation.id, assignedAt: new Date() },
        });
        assignedIds.push(participation.id);
      }

      return { assignedIds, eligible };
    });

    if (!result) {
      return; // Already processed
    }

    this.eventRealtime.invalidateEvent(event.id, 'all');

    // Notify eligible participants about lottery outcome
    const { assignedIds, eligible } = result;

    for (const p of eligible) {
      const gotSlot = assignedIds.includes(p.id);
      try {
        await this.pushService.notifyParticipationStatus(
          p.userId,
          event.title,
          gotSlot ? 'SLOT_ASSIGNED' : 'LOTTERY_NOT_SELECTED',
          event.id,
        );
      } catch (err) {
        this.logger.error(
          `Lottery notification failed for user ${p.userId}, event ${event.id}: ${err}`,
        );
      }
    }

    this.logger.log(
      `Lottery completed for event "${event.title}": ${assignedIds.length} slots assigned, ` +
        `${eligible.length - assignedIds.length} eligible but not selected`,
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
