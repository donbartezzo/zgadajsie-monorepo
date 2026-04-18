/**
 * Test integracyjny: join → payment → confirm
 * Wymaga działającej bazy testowej (docker-compose.test.yml, port 5434)
 */
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5434/zgadajsie_test?schema=public';

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { EnrollmentService } from '../modules/enrollment/enrollment.service';
import { EnrollmentEligibilityService } from '../modules/enrollment/enrollment-eligibility.service';
import { SlotService } from '../modules/slots/slot.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../modules/notifications/email.service';
import { PushService } from '../modules/notifications/push.service';
import { EventRealtimeService } from '../modules/realtime/event-realtime.service';
import { PaymentsService } from '../modules/payments/payments.service';

const TEST_PREFIX = 'intpay_';
const MS_PER_HOUR = 3600_000;

function future(hours = 24 * 7): Date {
  return new Date(Date.now() + hours * MS_PER_HOUR);
}

describe('[Integration] Enrollment join flow', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let enrollmentService: EnrollmentService;

  const mockEmail = {
    sendNewApplicationEmail: jest.fn().mockResolvedValue(undefined),
    sendParticipationStatusEmail: jest.fn().mockResolvedValue(undefined),
    sendEnrollmentConfirmation: jest.fn().mockResolvedValue(undefined),
    sendEnrollmentCancelledEmail: jest.fn().mockResolvedValue(undefined),
  };
  const mockPush = {
    notifyParticipationStatus: jest.fn().mockResolvedValue(undefined),
    notifyNewApplication: jest.fn().mockResolvedValue(undefined),
    notifySlotAssigned: jest.fn().mockResolvedValue(undefined),
  };
  const mockRealtime = { invalidateEvent: jest.fn() };
  const mockPayments = { cleanupIntents: jest.fn().mockResolvedValue(undefined) };
  const mockSlotService = {
    assignSlot: jest.fn().mockResolvedValue(null),
    releaseSlot: jest.fn().mockResolvedValue(undefined),
    findFreeSlotForRole: jest.fn().mockResolvedValue(null),
    getFreeSlotCount: jest.fn().mockResolvedValue(0),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        EnrollmentService,
        EnrollmentEligibilityService,
        ConfigService,
        { provide: EmailService, useValue: mockEmail },
        { provide: PushService, useValue: mockPush },
        { provide: EventRealtimeService, useValue: mockRealtime },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: SlotService, useValue: mockSlotService },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    enrollmentService = module.get(EnrollmentService);
    await module.init();

    await Promise.all([
      prisma.city.upsert({ where: { slug: 'test-city' }, create: { slug: 'test-city', name: 'Test City', isActive: true }, update: {} }),
      prisma.eventDiscipline.upsert({ where: { slug: 'football' }, create: { slug: 'football' }, update: {} }),
      prisma.eventFacility.upsert({ where: { slug: 'pitch' }, create: { slug: 'pitch' }, update: {} }),
      prisma.eventLevel.upsert({ where: { slug: 'mixed-open' }, create: { slug: 'mixed-open' }, update: {} }),
    ]);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: TEST_PREFIX } } });
    const userIds = users.map((u) => u.id);
    await prisma.organizerUserRelation.deleteMany({
      where: { OR: [{ organizerUserId: { in: userIds } }, { targetUserId: { in: userIds } }] },
    });
    await prisma.eventEnrollment.deleteMany({ where: { event: { title: { startsWith: TEST_PREFIX } } } });
    await prisma.event.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
    await module.close();
  });

  async function createOrganizer(suffix: string) {
    return prisma.user.create({
      data: {
        email: `${TEST_PREFIX}org_${suffix}@test.pl`,
        displayName: 'Organizer',
        passwordHash: 'hash',
        isActive: true,
        isEmailVerified: true,
        role: 'USER',
      },
    });
  }

  async function createUser(suffix: string) {
    return prisma.user.create({
      data: {
        email: `${TEST_PREFIX}user_${suffix}@test.pl`,
        displayName: 'Uczestnik',
        passwordHash: 'hash',
        isActive: true,
        isEmailVerified: true,
        role: 'USER',
      },
    });
  }

  async function createOpenEvent(organizerId: string, suffix: string, cost = 0) {
    const startsAt = future();
    const event = await prisma.event.create({
      data: {
        title: `${TEST_PREFIX}event_${suffix}`,
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'test-city',
        organizerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2 * MS_PER_HOUR),
        maxParticipants: 10,
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21.0,
        costPerPerson: cost,
        lotteryExecutedAt: new Date(), // OPEN_ENROLLMENT (already drawn)
      },
    });
    return event;
  }

  describe('join() — OPEN_ENROLLMENT', () => {
    it('trusted user może dołączyć do bezpłatnego eventu (PENDING → enrollment)', async () => {
      const suffix = `a_${Date.now()}`;
      const organizer = await createOrganizer(suffix);
      const user = await createUser(suffix);
      const event = await createOpenEvent(organizer.id, suffix, 0);

      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizer.id,
          targetUserId: user.id,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: false,
        },
      });

      const enrollment = await enrollmentService.join(event.id, user.id);

      expect(enrollment).toBeDefined();
      expect(enrollment.userId).toBe(user.id);
      expect(enrollment.eventId).toBe(event.id);

      const dbEnrollment = await prisma.eventEnrollment.findUnique({
        where: { id: enrollment.id },
      });
      expect(dbEnrollment).not.toBeNull();
      expect(dbEnrollment?.wantsIn).toBe(true);

      // Cleanup
      await prisma.eventEnrollment.deleteMany({ where: { eventId: event.id } });
      await prisma.organizerUserRelation.deleteMany({ where: { organizerUserId: organizer.id } });
      await prisma.event.delete({ where: { id: event.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
    });

    it('banned user dołącza z waitingReason BANNED (nie jest odrzucony natychmiastowo)', async () => {
      const suffix = `b_${Date.now()}`;
      const organizer = await createOrganizer(suffix);
      const user = await createUser(suffix);
      const event = await createOpenEvent(organizer.id, suffix, 0);

      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizer.id,
          targetUserId: user.id,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: true,
          bannedAt: new Date(),
        },
      });

      const enrollment = await enrollmentService.join(event.id, user.id);
      expect(enrollment.waitingReason).toBe('BANNED');

      // Cleanup
      await prisma.eventEnrollment.deleteMany({ where: { eventId: event.id } });
      await prisma.organizerUserRelation.deleteMany({ where: { organizerUserId: organizer.id } });
      await prisma.event.delete({ where: { id: event.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
    });

    it('podwójne dołączenie (rejoin) przywraca wantsIn=true', async () => {
      const suffix = `c_${Date.now()}`;
      const organizer = await createOrganizer(suffix);
      const user = await createUser(suffix);
      const event = await createOpenEvent(organizer.id, suffix, 0);

      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizer.id,
          targetUserId: user.id,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: false,
        },
      });

      const first = await enrollmentService.join(event.id, user.id);

      // Withdraw
      await prisma.eventEnrollment.update({
        where: { id: first.id },
        data: { wantsIn: false },
      });

      // Rejoin
      const second = await enrollmentService.join(event.id, user.id);
      expect(second.id).toBe(first.id);

      const dbEnrollment = await prisma.eventEnrollment.findUnique({ where: { id: first.id } });
      expect(dbEnrollment?.wantsIn).toBe(true);

      // Cleanup
      await prisma.eventEnrollment.deleteMany({ where: { eventId: event.id } });
      await prisma.organizerUserRelation.deleteMany({ where: { organizerUserId: organizer.id } });
      await prisma.event.delete({ where: { id: event.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
    });
  });
});
