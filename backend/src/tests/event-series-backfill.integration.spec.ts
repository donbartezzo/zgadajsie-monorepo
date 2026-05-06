/**
 * Test integracyjny: backfill legacy serii wydarzeń.
 * Wymaga działającej bazy testowej (docker-compose.test.yml, port 5434)
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/zgadajsie_test?schema=public';

import { PrismaClient } from '@prisma/client';
import { runEventSeriesBackfill } from '../modules/event-series/event-series-backfill.util';

const TEST_PREFIX = `backfill_${Date.now()}_`;
const MS_PER_HOUR = 3_600_000;

function makeStartDate(): Date {
  return new Date(Date.now() + 24 * MS_PER_HOUR);
}

describe('[Integration] Event series backfill', () => {
  let prisma: PrismaClient;
  let organizerId: string;
  let parentEventId: string;
  let childEventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    await Promise.all([
      prisma.city.upsert({
        where: { slug: 'test-city' },
        create: { slug: 'test-city', name: 'Test City', isActive: true },
        update: {},
      }),
      prisma.eventDiscipline.upsert({
        where: { slug: 'football' },
        create: { slug: 'football' },
        update: {},
      }),
      prisma.eventFacility.upsert({
        where: { slug: 'pitch' },
        create: { slug: 'pitch' },
        update: {},
      }),
      prisma.eventLevel.upsert({
        where: { slug: 'mixed-open' },
        create: { slug: 'mixed-open' },
        update: {},
      }),
    ]);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } });
    await prisma.eventSeries.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  async function createLegacySeriesFixture(): Promise<void> {
    const organizer = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}organizer@test.pl`,
        displayName: 'Organizer',
        passwordHash: 'hash',
        isActive: true,
        isEmailVerified: true,
        role: 'USER',
      },
    });
    organizerId = organizer.id;

    const parentStart = makeStartDate();
    const childStart = new Date(parentStart.getTime() + 7 * 24 * MS_PER_HOUR);

    const parent = await prisma.event.create({
      data: {
        title: `${TEST_PREFIX}series_parent`,
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'test-city',
        organizerId,
        startsAt: parentStart,
        endsAt: new Date(parentStart.getTime() + 2 * MS_PER_HOUR),
        maxParticipants: 10,
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21,
        isRecurring: true,
        recurringRule: 'WEEKLY',
      },
    });
    parentEventId = parent.id;

    const child = await prisma.event.create({
      data: {
        title: `${TEST_PREFIX}series_child`,
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'test-city',
        organizerId,
        startsAt: childStart,
        endsAt: new Date(childStart.getTime() + 2 * MS_PER_HOUR),
        maxParticipants: 10,
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21,
        isRecurring: true,
        recurringRule: 'WEEKLY',
        parentEventId: parent.id,
      },
    });
    childEventId = child.id;
  }

  it('backfill tworzy jedną serię i jest idempotentny przy drugim uruchomieniu', async () => {
    await createLegacySeriesFixture();

    const firstRun = await runEventSeriesBackfill(prisma);
    expect(firstRun).toEqual({
      parents: 1,
      created: 1,
      updated: 0,
      skipped: 0,
    });

    const afterFirstRun = await prisma.event.findMany({
      where: { id: { in: [parentEventId, childEventId] } },
      select: { id: true, seriesId: true },
      orderBy: { id: 'asc' },
    });

    expect(afterFirstRun).toHaveLength(2);
    expect(afterFirstRun[0].seriesId).toBeDefined();
    expect(afterFirstRun[1].seriesId).toBe(afterFirstRun[0].seriesId);

    const seriesAfterFirstRun = await prisma.eventSeries.findMany({
      where: { organizerId, name: `${TEST_PREFIX}series_parent` },
      select: { id: true, name: true, recurrenceType: true, intervalDays: true, isActive: true },
    });

    expect(seriesAfterFirstRun).toHaveLength(1);
    expect(seriesAfterFirstRun[0]).toMatchObject({
      name: `${TEST_PREFIX}series_parent`,
      recurrenceType: 'INTERVAL',
      intervalDays: 7,
      isActive: true,
    });

    const secondRun = await runEventSeriesBackfill(prisma);
    expect(secondRun).toEqual({
      parents: 1,
      created: 0,
      updated: 1,
      skipped: 0,
    });

    const seriesAfterSecondRun = await prisma.eventSeries.findMany({
      where: { organizerId, name: `${TEST_PREFIX}series_parent` },
      select: { id: true },
    });

    expect(seriesAfterSecondRun).toHaveLength(1);
    expect(seriesAfterSecondRun[0].id).toBe(afterFirstRun[0].seriesId);
  });
});
