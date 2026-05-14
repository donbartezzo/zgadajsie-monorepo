import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduledJobsService } from '../../common/scheduled-jobs/scheduled-jobs.service';
import { FakeUserPickerService } from './fake-user-picker.service';
import { featureFlags } from '../../common/config/feature-flags';
import { FAKE_USERS_MIN_FREE_SLOTS_BUFFER } from '@zgadajsie/shared';

const FAKE_USER_ENROLL = 'FAKE_USER_ENROLL';
const FAKE_USER_WITHDRAW = 'FAKE_USER_WITHDRAW';

@Injectable()
export class FakeUsersHandlersService implements OnModuleInit {
  private readonly logger = new Logger(FakeUsersHandlersService.name);

  constructor(
    private prisma: PrismaService,
    private scheduledJobs: ScheduledJobsService,
    private picker: FakeUserPickerService,
  ) {}

  onModuleInit() {
    this.scheduledJobs.registerHandler(FAKE_USER_ENROLL, this.handleFakeUserEnroll.bind(this));
    this.scheduledJobs.registerHandler(FAKE_USER_WITHDRAW, this.handleFakeUserWithdraw.bind(this));

    this.logger.log('Registered fake users handlers');
  }

  private async handleFakeUserEnroll(payload: unknown): Promise<void> {
    const { eventId, userId } = payload as { eventId: string; userId?: string };

    // Jeśli userId jest podane (ręczne dodanie przez admina), użyj tej osoby
    // Jeśli nie, użyj pickera
    const fakeUserId = userId || (await this.picker.pickFakeUserForEvent(eventId));

    if (!fakeUserId) {
      this.logger.warn(`Brak dostępnej persony dla wydarzenia ${eventId}`);
      throw new BadRequestException('Brak dostępnej persony fake user');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        maxParticipants: true,
        targetOccupancy: true,
        status: true,
        startsAt: true,
      },
    });

    if (!event) {
      this.logger.warn(`Wydarzenie ${eventId} nie istnieje`);
      throw new BadRequestException('Wydarzenie nie istnieje');
    }

    // Sprawdź feature flag
    if (!featureFlags.enableFakeUsers) {
      this.logger.warn(`Feature flag enableFakeUsers jest wyłączona`);
      throw new BadRequestException('Fake users są wyłączone');
    }

    // Sprawdź warunek bufora (6.4)
    const activeEnrollmentsCount = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
      },
    });

    const freePlaces = event.maxParticipants - activeEnrollmentsCount;

    if (freePlaces < FAKE_USERS_MIN_FREE_SLOTS_BUFFER) {
      this.logger.warn(
        `Brak wystarczającej liczby wolnych miejsc (bufor ${FAKE_USERS_MIN_FREE_SLOTS_BUFFER}) dla wydarzenia ${eventId}`,
      );
      throw new BadRequestException(
        `Brak wystarczającej liczby wolnych miejsc (bufor: ${FAKE_USERS_MIN_FREE_SLOTS_BUFFER})`,
      );
    }

    // Sprawdź czy fake user nie jest już zapisany
    const existingEnrollment = await this.prisma.eventEnrollment.findFirst({
      where: {
        eventId,
        userId: fakeUserId,
      },
    });

    if (existingEnrollment) {
      this.logger.warn(`Fake user ${fakeUserId} jest już zapisany na wydarzenie ${eventId}`);
      throw new BadRequestException('Fake user jest już zapisany');
    }

    // Utwórz enrollment (addedByUserId = null - fake user "zapisał się sam")
    await this.prisma.eventEnrollment.create({
      data: {
        eventId,
        userId: fakeUserId,
        addedByUserId: null,
        wantsIn: true,
      },
    });

    this.logger.log(`Fake user ${fakeUserId} zapisany na wydarzenie ${eventId}`);
  }

  private async handleFakeUserWithdraw(payload: unknown): Promise<void> {
    const { eventId, userId } = payload as { eventId: string; userId: string };

    const enrollment = await this.prisma.eventEnrollment.findFirst({
      where: {
        eventId,
        userId,
      },
    });

    if (!enrollment) {
      this.logger.warn(`Zgłoszenie nie istnieje: ${eventId}/${userId}`);
      throw new BadRequestException('Zgłoszenie nie istnieje');
    }

    // Wypisz fake usera (withdrawnBy = USER - wygląda jak dobrowolne wyjście)
    await this.prisma.eventEnrollment.update({
      where: { id: enrollment.id },
      data: {
        wantsIn: false,
        withdrawnBy: 'USER',
      },
    });

    this.logger.log(`Fake user ${userId} wypisany z wydarzenia ${eventId}`);
  }
}
