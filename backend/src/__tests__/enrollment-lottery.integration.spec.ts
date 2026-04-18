/**
 * Test integracyjny: PRE_ENROLLMENT → loteria → OPEN_ENROLLMENT
 * Wymaga działającej bazy testowej (docker-compose.test.yml, port 5434)
 */
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5434/zgadajsie_test?schema=public';

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { EnrollmentLotteryCron } from '../modules/notifications/enrollment-lottery.cron';
import { PushService } from '../modules/notifications/push.service';
import { EventRealtimeService } from '../modules/realtime/event-realtime.service';

const TEST_PREFIX = 'intlot_';
const PRE_ENROLLMENT_HOURS = 48;
const MS_PER_HOUR = 3600_000;

function startsInHours(h: number): Date {
  return new Date(Date.now() + h * MS_PER_HOUR);
}

describe('[Integration] EnrollmentLotteryCron — lottery flow', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let cron: EnrollmentLotteryCron;

  const mockPush = { notifyParticipationStatus: jest.fn().mockResolvedValue(undefined) };
  const mockRealtime = { invalidateEvent: jest.fn() };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        EnrollmentLotteryCron,
        { provide: PushService, useValue: mockPush },
        { provide: EventRealtimeService, useValue: mockRealtime },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    cron = module.get(EnrollmentLotteryCron);
    await module.init();
  });

  beforeAll(async () => {
    await Promise.all([
      prisma.city.upsert({ where: { slug: 'test-city' }, create: { slug: 'test-city', name: 'Test City', isActive: true }, update: {} }),
      prisma.eventDiscipline.upsert({ where: { slug: 'football' }, create: { slug: 'football' }, update: {} }),
      prisma.eventFacility.upsert({ where: { slug: 'pitch' }, create: { slug: 'pitch' }, update: {} }),
      prisma.eventLevel.upsert({ where: { slug: 'mixed-open' }, create: { slug: 'mixed-open' }, update: {} }),
    ]);
  });

  afterAll(async () => {
    await prisma.eventSlot.deleteMany({ where: { event: { title: { startsWith: TEST_PREFIX } } } });
    await prisma.eventEnrollment.deleteMany({ where: { event: { title: { startsWith: TEST_PREFIX } } } });
    await prisma.organizerUserRelation.deleteMany({ where: { organizerUserId: { startsWith: TEST_PREFIX } } });
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

  async function createEvent(organizerId: string, suffix: string, startsAt: Date) {
    return prisma.event.create({
      data: {
        title: `${TEST_PREFIX}event_${suffix}`,
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'test-city',
        organizerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2 * MS_PER_HOUR),
        maxParticipants: 2,
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21.0,
        lotteryExecutedAt: null,
      },
    });
  }

  it('ustawia lotteryExecutedAt dla eventu w oknie PRE_ENROLLMENT (< 48h)', async () => {
    const suffix = `a_${Date.now()}`;
    const organizer = await createOrganizer(suffix);
    const startsAt = startsInHours(PRE_ENROLLMENT_HOURS - 1);
    const event = await createEvent(organizer.id, suffix, startsAt);

    await cron.handleLottery();

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.lotteryExecutedAt).not.toBeNull();

    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: organizer.id } });
  });

  it('nie przetwarza eventu spoza okna PRE_ENROLLMENT (> 48h)', async () => {
    const suffix = `b_${Date.now()}`;
    const organizer = await createOrganizer(suffix);
    const startsAt = startsInHours(PRE_ENROLLMENT_HOURS + 10);
    const event = await createEvent(organizer.id, suffix, startsAt);

    await cron.handleLottery();

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.lotteryExecutedAt).toBeNull();

    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: organizer.id } });
  });

  it('nie przetwarza eventu z już ustawionym lotteryExecutedAt', async () => {
    const suffix = `c_${Date.now()}`;
    const organizer = await createOrganizer(suffix);
    const startsAt = startsInHours(PRE_ENROLLMENT_HOURS - 1);
    const pastLottery = new Date(Date.now() - 3600_000);
    const event = await prisma.event.create({
      data: {
        title: `${TEST_PREFIX}event_${suffix}`,
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'test-city',
        organizerId: organizer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2 * MS_PER_HOUR),
        maxParticipants: 2,
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21.0,
        lotteryExecutedAt: pastLottery,
      },
    });

    jest.clearAllMocks();
    await cron.handleLottery();

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.lotteryExecutedAt?.toISOString()).toBe(pastLottery.toISOString());

    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: organizer.id } });
  });

  it('przydziela slot trusted uczestnikowi w loterii', async () => {
    const suffix = `d_${Date.now()}`;
    const organizer = await createOrganizer(suffix);
    const user = await createUser(suffix);
    const startsAt = startsInHours(PRE_ENROLLMENT_HOURS - 1);
    const event = await createEvent(organizer.id, suffix, startsAt);

    await prisma.eventSlot.create({ data: { eventId: event.id, roleKey: null } });
    await prisma.organizerUserRelation.create({
      data: { organizerUserId: organizer.id, targetUserId: user.id, isTrusted: true, trustedAt: new Date(), isBanned: false },
    });

    const enrollment = await prisma.eventEnrollment.create({
      data: {
        eventId: event.id,
        userId: user.id,
        wantsIn: true,
      },
    });

    await cron.handleLottery();

    const slot = await prisma.eventSlot.findFirst({ where: { eventId: event.id } });
    expect(slot?.enrollmentId).toBe(enrollment.id);

    await prisma.eventSlot.deleteMany({ where: { eventId: event.id } });
    await prisma.eventEnrollment.deleteMany({ where: { eventId: event.id } });
    await prisma.organizerUserRelation.deleteMany({ where: { organizerUserId: organizer.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
  });
});
