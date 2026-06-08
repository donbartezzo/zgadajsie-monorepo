import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduledJobsService } from '../../common/scheduled-jobs/scheduled-jobs.service';
import { featureFlags } from '../../common/config/feature-flags';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';

const FAKE_USER_ENROLL = 'FAKE_USER_ENROLL';
const FAKE_USER_WITHDRAW = 'FAKE_USER_WITHDRAW';

type EventWithConfig = {
  id: string;
  maxParticipants: number;
  startsAt: Date;
  lotteryExecutedAt: Date | null;
  status: string;
  targetOccupancyConfig: {
    targetOccupancy: number;
    cleanupHours: number;
    minFreeSlotsBuffer: number;
  };
};

@Injectable()
export class FakeUsersMonitorService {
  private readonly logger = new Logger(FakeUsersMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private scheduledJobs: ScheduledJobsService,
  ) {}

  async monitorEvents(): Promise<void> {
    if (!featureFlags.enableFakeUsers) {
      this.logger.log('Feature flag enableFakeUsers is disabled, skipping');
      return;
    }

    const now = new Date();
    const events = await this.getQualifiedEvents(now);

    this.logger.log(`Monitoring ${events.length} events for fake users`);

    for (const event of events) {
      await this.processEvent(event, now);
    }
  }

  private async getQualifiedEvents(now: Date): Promise<EventWithConfig[]> {
    return this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { gt: now },
        targetOccupancyConfig: {
          targetOccupancy: { gte: 1 },
        },
      },
      select: {
        id: true,
        maxParticipants: true,
        startsAt: true,
        lotteryExecutedAt: true,
        status: true,
        targetOccupancyConfig: true,
      },
    }) as Promise<EventWithConfig[]>;
  }

  private async processEvent(event: EventWithConfig, now: Date): Promise<void> {
    const phase = getEnrollmentPhase(event, now);

    // Pomiń tylko fazę po starcie (null = zakończone)
    if (phase === null) {
      return;
    }

    const { targetOccupancy, cleanupHours, minFreeSlotsBuffer } = event.targetOccupancyConfig;

    // Finalny cleanup: X godzin przed startem (cleanupHours = 0 → wyłączone)
    if (cleanupHours > 0) {
      const hoursUntilStart = (event.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart <= cleanupHours) {
        await this.scheduleFinalCleanup(event.id);
        return;
      }
    }

    const metrics = await this.calculateOccupancyMetrics(
      event.id,
      event.maxParticipants,
      targetOccupancy,
      minFreeSlotsBuffer,
    );

    if (!metrics) {
      return;
    }

    if (metrics.activeEnrollments < metrics.targetCount) {
      await this.scheduleFakeUserEnroll(event.id, metrics);
    } else if (metrics.activeEnrollments > metrics.targetCount) {
      await this.scheduleFakeUserWithdraw(event.id, metrics);
    }
  }

  private async calculateOccupancyMetrics(
    eventId: string,
    maxParticipants: number,
    targetOccupancy: number,
    minFreeSlotsBuffer: number,
  ) {
    if (!targetOccupancy) {
      return null;
    }

    const activeEnrollments = await this.prisma.eventEnrollment.count({
      where: { eventId, wantsIn: true },
    });

    // Idempotencja: dolicz PENDING joby by uniknąć przestrzeleń
    const pendingEnrollJobs = await this.prisma.scheduledJob.count({
      where: {
        type: FAKE_USER_ENROLL,
        status: 'PENDING',
        payload: {
          path: ['eventId'],
          equals: eventId,
        },
      },
    });

    const pendingWithdrawJobs = await this.prisma.scheduledJob.count({
      where: {
        type: FAKE_USER_WITHDRAW,
        status: 'PENDING',
        payload: {
          path: ['eventId'],
          equals: eventId,
        },
      },
    });

    const effectiveEnrollments = activeEnrollments + pendingEnrollJobs - pendingWithdrawJobs;

    const fakeActiveCount = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
        user: { accountType: 'FAKE' },
      },
    });

    const targetCount = Math.ceil((targetOccupancy / 100) * maxParticipants);
    const freePlaces = maxParticipants - effectiveEnrollments;

    return {
      activeEnrollments: effectiveEnrollments,
      fakeActiveCount,
      targetCount,
      freePlaces,
      maxParticipants,
      buffer: minFreeSlotsBuffer,
    };
  }

  private async scheduleFakeUserEnroll(
    eventId: string,
    metrics: {
      activeEnrollments: number;
      fakeActiveCount: number;
      targetCount: number;
      freePlaces: number;
      maxParticipants: number;
      buffer: number;
    },
  ): Promise<void> {
    const deficit = metrics.targetCount - metrics.activeEnrollments;
    const maxToAdd = Math.max(0, metrics.freePlaces - metrics.buffer);
    const toAdd = Math.min(deficit, maxToAdd);

    if (toAdd <= 0) {
      this.logger.log(`Event ${eventId}: deficit ${deficit} but no buffer space`);
      return;
    }

    this.logger.log(`Event ${eventId}: scheduling ${toAdd} fake user enrollments`);

    const now = new Date();
    const scheduledJobs: Promise<string>[] = [];

    for (let i = 0; i < toAdd; i++) {
      const delayMinutes = Math.random() * 5;
      const scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
      scheduledJobs.push(
        this.scheduledJobs.scheduleJob(FAKE_USER_ENROLL, { eventId }, scheduledAt),
      );
    }

    await Promise.all(scheduledJobs);
  }

  private async scheduleFakeUserWithdraw(
    eventId: string,
    metrics: {
      activeEnrollments: number;
      fakeActiveCount: number;
      targetCount: number;
      freePlaces: number;
      maxParticipants: number;
    },
  ): Promise<void> {
    const surplus = metrics.activeEnrollments - metrics.targetCount;

    if (metrics.fakeActiveCount === 0) {
      this.logger.log(`Event ${eventId}: surplus ${surplus} but no fake users to withdraw`);
      return;
    }

    const toWithdraw = Math.min(surplus, metrics.fakeActiveCount);
    this.logger.log(`Event ${eventId}: scheduling ${toWithdraw} fake user withdrawals`);

    const waitingRealUsers = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
        user: { accountType: { not: 'FAKE' } },
        slot: null,
      },
    });

    let fakeUsersToWithdraw;

    if (waitingRealUsers > 0) {
      fakeUsersToWithdraw = await this.prisma.eventEnrollment.findMany({
        where: {
          eventId,
          wantsIn: true,
          user: { accountType: 'FAKE' },
          slot: { isNot: null },
        },
        select: { userId: true },
        take: toWithdraw,
      });

      if (fakeUsersToWithdraw.length < toWithdraw) {
        const remaining = toWithdraw - fakeUsersToWithdraw.length;
        const withoutSlots = await this.prisma.eventEnrollment.findMany({
          where: {
            eventId,
            wantsIn: true,
            user: { accountType: 'FAKE' },
            slot: null,
            userId: { notIn: fakeUsersToWithdraw.map((e) => e.userId) },
          },
          select: { userId: true },
          take: remaining,
        });
        fakeUsersToWithdraw = [...fakeUsersToWithdraw, ...withoutSlots];
      }
    } else {
      fakeUsersToWithdraw = await this.prisma.eventEnrollment.findMany({
        where: {
          eventId,
          wantsIn: true,
          user: { accountType: 'FAKE' },
        },
        select: { userId: true },
        take: toWithdraw,
      });
    }

    const now = new Date();
    const scheduledJobs: Promise<string>[] = [];

    for (const enrollment of fakeUsersToWithdraw) {
      const delayMinutes = Math.random() * 5;
      const scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
      scheduledJobs.push(
        this.scheduledJobs.scheduleJob(
          FAKE_USER_WITHDRAW,
          { eventId, userId: enrollment.userId },
          scheduledAt,
        ),
      );
    }

    await Promise.all(scheduledJobs);
  }

  private async scheduleFinalCleanup(eventId: string): Promise<void> {
    this.logger.log(`Event ${eventId}: scheduling final cleanup of all fake users`);

    const fakeUsers = await this.prisma.eventEnrollment.findMany({
      where: {
        eventId,
        wantsIn: true,
        user: { accountType: 'FAKE' },
      },
      select: { userId: true },
    });

    if (fakeUsers.length === 0) {
      return;
    }

    const now = new Date();
    const scheduledJobs: Promise<string>[] = [];

    for (const enrollment of fakeUsers) {
      const delayMinutes = Math.random() * 5;
      const scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
      scheduledJobs.push(
        this.scheduledJobs.scheduleJob(
          FAKE_USER_WITHDRAW,
          { eventId, userId: enrollment.userId },
          scheduledAt,
        ),
      );
    }

    await Promise.all(scheduledJobs);
  }

  async handleTargetOccupancyChange(
    eventId: string,
    newTargetOccupancy: number | null,
  ): Promise<void> {
    if (newTargetOccupancy === null || newTargetOccupancy === 0) {
      await this.scheduledJobs.cancelJobsByType(FAKE_USER_ENROLL, eventId);
      await this.scheduleFinalCleanup(eventId);
    } else {
      await this.monitorSingleEvent(eventId);
    }
  }

  async monitorSingleEvent(eventId: string): Promise<void> {
    const now = new Date();
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        maxParticipants: true,
        startsAt: true,
        lotteryExecutedAt: true,
        status: true,
        targetOccupancyConfig: true,
      },
    });

    if (!event || !event.targetOccupancyConfig) {
      return;
    }

    await this.processEvent(event as EventWithConfig, now);
  }
}
