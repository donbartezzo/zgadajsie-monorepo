import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PRE_ENROLLMENT_HOURS, MILLISECONDS_PER_HOUR } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'enrollment-lottery';

@Injectable()
export class EnrollmentLotteryCron implements OnModuleInit {
  private readonly logger = new Logger(EnrollmentLotteryCron.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private eventRealtime: EventRealtimeService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleLottery());
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: CRON_NAME })
  async handleLottery(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
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

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Enrollment lottery cron failed: ${error}`);
    }
  }

  async executeLotteryForEvent(event: {
    id: string;
    maxParticipants: number;
    organizerId: string;
    title: string;
  }): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.event.updateMany({
        where: { id: event.id, lotteryExecutedAt: null },
        data: { lotteryExecutedAt: new Date() },
      });
      if (locked.count === 0) {
        return null;
      }

      const allParticipations = await tx.eventEnrollment.findMany({
        where: { eventId: event.id, wantsIn: true, addedByUserId: null },
        include: { slot: { select: { id: true } } },
      });

      const preAssigned = allParticipations.filter((p) => p.slot !== null);
      const pendingParticipations = allParticipations.filter((p) => p.slot === null);

      if (allParticipations.length === 0) {
        return { assignedIds: [], eligible: [], preAssignedIds: [] };
      }

      const uniqueUserIds = [...new Set(pendingParticipations.map((p) => p.userId))];
      const relationMap = new Map<string, { isTrusted: boolean; isBanned: boolean }>();

      if (uniqueUserIds.length > 0) {
        const relations = await tx.organizerUserRelation.findMany({
          where: {
            organizerUserId: event.organizerId,
            targetUserId: { in: uniqueUserIds },
          },
          select: { targetUserId: true, isTrusted: true, isBanned: true },
        });
        for (const r of relations) {
          relationMap.set(r.targetUserId, { isTrusted: r.isTrusted, isBanned: r.isBanned });
        }
      }

      const eligible = pendingParticipations.filter((p) => {
        const rel = relationMap.get(p.userId);
        return rel?.isTrusted === true && rel?.isBanned !== true;
      });

      const shuffled = shuffleArray(eligible);
      const assignedIds: string[] = [];

      for (const participation of shuffled) {
        const freeSlot = await tx.eventSlot.findFirst({
          where: { eventId: event.id, enrollmentId: null, locked: false },
        });
        if (!freeSlot) break;
        await tx.eventSlot.update({
          where: { id: freeSlot.id },
          data: { enrollmentId: participation.id, assignedAt: new Date() },
        });
        assignedIds.push(participation.id);
      }

      return {
        assignedIds,
        eligible,
        preAssignedIds: preAssigned.map((p) => ({ id: p.id, userId: p.userId })),
      };
    });

    if (!result) {
      return;
    }

    this.eventRealtime.invalidateEvent(event.id, 'all');

    const { assignedIds, eligible, preAssignedIds } = result;

    // Notify participants who got a slot via lottery + those who were pre-assigned by organizer
    // during pre-enrollment phase (notifications were suppressed until now).
    for (const preAssigned of preAssignedIds) {
      try {
        await this.pushService.notifyParticipationStatus(
          preAssigned.userId,
          event.title,
          'SLOT_ASSIGNED',
          event.id,
        );
      } catch (err) {
        this.logger.error(
          `Pre-assigned notification failed for user ${preAssigned.userId}, event ${event.id}: ${err}`,
        );
      }
    }

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
        `${eligible.length - assignedIds.length} eligible but not selected, ` +
        `${preAssignedIds.length} pre-assigned notified`,
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
