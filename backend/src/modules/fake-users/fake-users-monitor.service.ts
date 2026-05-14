import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduledJobsService } from '../../common/scheduled-jobs/scheduled-jobs.service';
import { featureFlags } from '../../common/config/feature-flags';
import {
  FAKE_USERS_MIN_FREE_SLOTS_BUFFER,
  FAKE_USERS_FINAL_CLEANUP_HOURS,
} from '@zgadajsie/shared';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';

const FAKE_USER_ENROLL = 'FAKE_USER_ENROLL';
const FAKE_USER_WITHDRAW = 'FAKE_USER_WITHDRAW';

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

  private async getQualifiedEvents(now: Date) {
    return this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        targetOccupancy: { gte: 1 },
        startsAt: { gt: now },
      },
      select: {
        id: true,
        maxParticipants: true,
        targetOccupancy: true,
        startsAt: true,
        lotteryExecutedAt: true,
        status: true,
      },
    });
  }

  private async processEvent(
    event: {
      id: string;
      maxParticipants: number;
      targetOccupancy: number | null;
      startsAt: Date;
      lotteryExecutedAt: Date | null;
      status: string;
    },
    now: Date,
  ): Promise<void> {
    const phase = getEnrollmentPhase(event, now);

    // Tylko OPEN_ENROLLMENT (po loterii, przed startem)
    if (phase !== 'OPEN_ENROLLMENT') {
      return;
    }

    // Finalny cleanup: X godzin przed startem
    const hoursUntilStart = (event.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilStart <= FAKE_USERS_FINAL_CLEANUP_HOURS) {
      await this.scheduleFinalCleanup(event.id);
      return;
    }

    // Policz obciążenie
    const metrics = await this.calculateOccupancyMetrics(
      event.id,
      event.maxParticipants,
      event.targetOccupancy,
    );

    if (!metrics) {
      return;
    }

    // Deficyt: dodaj fake users
    if (metrics.activeEnrollments < metrics.targetCount) {
      await this.scheduleFakeUserEnroll(event.id, metrics);
    }
    // Nadmiar: usuń fake users
    else if (metrics.activeEnrollments > metrics.targetCount) {
      await this.scheduleFakeUserWithdraw(event.id, metrics);
    }
  }

  private async calculateOccupancyMetrics(
    eventId: string,
    maxParticipants: number,
    targetOccupancy: number | null,
  ) {
    if (!targetOccupancy) {
      return null;
    }

    // Aktywne zgłoszenia (uczestnicy + oczekujący, bez wypisanych)
    const activeEnrollments = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
      },
    });

    // Fake users aktywni
    const fakeActiveCount = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
        user: {
          accountType: 'FAKE',
        },
      },
    });

    const targetCount = Math.ceil((targetOccupancy / 100) * maxParticipants);
    const freePlaces = maxParticipants - activeEnrollments;

    return {
      activeEnrollments,
      fakeActiveCount,
      targetCount,
      freePlaces,
      maxParticipants,
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
    },
  ): Promise<void> {
    const deficit = metrics.targetCount - metrics.activeEnrollments;

    // Ogranicz do bufora
    const maxToAdd = Math.max(0, metrics.freePlaces - FAKE_USERS_MIN_FREE_SLOTS_BUFFER);
    const toAdd = Math.min(deficit, maxToAdd);

    if (toAdd <= 0) {
      this.logger.log(`Event ${eventId}: deficit ${deficit} but no buffer space`);
      return;
    }

    this.logger.log(`Event ${eventId}: scheduling ${toAdd} fake user enrollments`);

    // Zaplanuj joby z losowym, narastającym scheduledAt
    const now = new Date();
    const scheduledJobs: Promise<string>[] = [];

    for (let i = 0; i < toAdd; i++) {
      // Losowe opóźnienie 0-5 minut dla każdego joba
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

    // Wypisuj tylko fake users
    if (metrics.fakeActiveCount === 0) {
      this.logger.log(`Event ${eventId}: surplus ${surplus} but no fake users to withdraw`);
      return;
    }

    const toWithdraw = Math.min(surplus, metrics.fakeActiveCount);

    this.logger.log(`Event ${eventId}: scheduling ${toWithdraw} fake user withdrawals`);

    // Pobierz fake users do wypisania
    // Priorytet: fake users zajmujący sloty gdy realni czekają
    const waitingRealUsers = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
        user: {
          accountType: {
            not: 'FAKE',
          },
        },
        slot: null,
      },
    });

    let fakeUsersToWithdraw;

    if (waitingRealUsers > 0) {
      // Priorytet: fake users na slotach
      fakeUsersToWithdraw = await this.prisma.eventEnrollment.findMany({
        where: {
          eventId,
          wantsIn: true,
          user: {
            accountType: 'FAKE',
          },
          slot: {
            isNot: null,
          },
        },
        select: {
          userId: true,
        },
        take: toWithdraw,
      });

      // Jeśli nie ma wystarczająco na slotach, dodaj bez slotów
      if (fakeUsersToWithdraw.length < toWithdraw) {
        const remaining = toWithdraw - fakeUsersToWithdraw.length;
        const withoutSlots = await this.prisma.eventEnrollment.findMany({
          where: {
            eventId,
            wantsIn: true,
            user: {
              accountType: 'FAKE',
            },
            slot: null,
            userId: {
              notIn: fakeUsersToWithdraw.map((e) => e.userId),
            },
          },
          select: {
            userId: true,
          },
          take: remaining,
        });

        fakeUsersToWithdraw = [...fakeUsersToWithdraw, ...withoutSlots];
      }
    } else {
      // Brak czekających realnych userów - wypisuj losowo
      fakeUsersToWithdraw = await this.prisma.eventEnrollment.findMany({
        where: {
          eventId,
          wantsIn: true,
          user: {
            accountType: 'FAKE',
          },
        },
        select: {
          userId: true,
        },
        take: toWithdraw,
      });
    }

    // Zaplanuj joby z losowym, narastającym scheduledAt
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

    // Pobierz wszystkie fake users
    const fakeUsers = await this.prisma.eventEnrollment.findMany({
      where: {
        eventId,
        wantsIn: true,
        user: {
          accountType: 'FAKE',
        },
      },
      select: {
        userId: true,
      },
    });

    if (fakeUsers.length === 0) {
      return;
    }

    // Zaplanuj withdrawal dla wszystkich
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
      // Wyłączenie: anuluj PENDING joby ENROLL, zaplanuj WITHDRAW wszystkich
      await this.scheduledJobs.cancelJobsByType(FAKE_USER_ENROLL, eventId);
      await this.scheduleFinalCleanup(eventId);
    } else {
      // Zmiana wartości: przelicz i zaplanuj dodanie/usunięcie
      // Natychmiastowe przeliczenie monitora
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
        targetOccupancy: true,
        startsAt: true,
        lotteryExecutedAt: true,
        status: true,
      },
    });

    if (!event) {
      return;
    }

    await this.processEvent(event, now);
  }
}
