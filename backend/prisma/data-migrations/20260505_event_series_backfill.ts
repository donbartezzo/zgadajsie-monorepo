/* eslint-disable no-console */
import { PrismaClient, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE, EventSeriesRecurrenceType } from '@zgadajsie/shared';

const LEGACY_SERIES_PREFIX = 'legacy-event-series';

type LegacyRecurringEvent = Prisma.EventGetPayload<{
  include: {
    childEvents: {
      select: {
        id: true;
        startsAt: true;
        seriesId: true;
      };
    };
  };
}>;

type SeriesConfig = {
  recurrenceType: EventSeriesRecurrenceType;
  intervalDays: number;
};

export interface BackfillSummary {
  parents: number;
  created: number;
  updated: number;
  skipped: number;
}

const LEGACY_RULE_MAP: Record<string, SeriesConfig> = {
  DAILY: {
    recurrenceType: EventSeriesRecurrenceType.INTERVAL,
    intervalDays: 1,
  },
  WEEKLY: {
    recurrenceType: EventSeriesRecurrenceType.INTERVAL,
    intervalDays: 7,
  },
  BIWEEKLY: {
    recurrenceType: EventSeriesRecurrenceType.INTERVAL,
    intervalDays: 14,
  },
  MONTHLY: {
    recurrenceType: EventSeriesRecurrenceType.INTERVAL,
    intervalDays: 30,
  },
};

function getSeriesId(parentId: string, existingSeriesId: string | null): string {
  return existingSeriesId ?? `${LEGACY_SERIES_PREFIX}-${parentId}`;
}

function mapRecurringRule(rule: string | null): SeriesConfig | null {
  if (!rule) {
    return null;
  }

  return LEGACY_RULE_MAP[rule] ?? null;
}

function toNumber(value: Prisma.Decimal | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}

function buildTemplateSnapshot(parent: LegacyRecurringEvent) {
  return {
    title: parent.title,
    description: parent.description ?? undefined,
    disciplineSlug: parent.disciplineSlug,
    facilitySlug: parent.facilitySlug,
    levelSlug: parent.levelSlug,
    citySlug: parent.citySlug,
    address: parent.address,
    lat: parent.lat,
    lng: parent.lng,
    costPerPerson: toNumber(parent.costPerPerson),
    minParticipants: parent.minParticipants ?? undefined,
    maxParticipants: parent.maxParticipants,
    ageMin: parent.ageMin ?? undefined,
    ageMax: parent.ageMax ?? undefined,
    gender: parent.gender,
    visibility: parent.visibility,
    coverImageId: parent.coverImageId ?? undefined,
    rules: parent.rules ?? undefined,
    facilityReserved: parent.facilityReserved,
    roleConfig: parent.roleConfig ? JSON.parse(JSON.stringify(parent.roleConfig)) : undefined,
  };
}

function getDurationMinutes(parent: LegacyRecurringEvent): number {
  return Math.max(1, Math.round((parent.endsAt.getTime() - parent.startsAt.getTime()) / 60000));
}

function getTimeInZone(date: Date): string {
  return DateTime.fromJSDate(date, { zone: APP_DEFAULT_TIMEZONE }).toFormat('HH:mm');
}

function getLastGeneratedAt(parent: LegacyRecurringEvent): Date {
  const candidates = [parent.startsAt, ...parent.childEvents.map((child) => child.startsAt)];
  return candidates.reduce((latest, candidate) => (candidate > latest ? candidate : latest));
}

async function backfillSeriesForParent(
  prisma: PrismaClient,
  parent: LegacyRecurringEvent,
): Promise<'created' | 'updated'> {
  const seriesConfig = mapRecurringRule(parent.recurringRule);

  if (!seriesConfig) {
    throw new Error(
      `Nieznany recurringRule="${parent.recurringRule ?? 'null'}" dla eventu ${parent.id}`,
    );
  }

  const seriesId = getSeriesId(parent.id, parent.seriesId);
  const lastGeneratedAt = getLastGeneratedAt(parent);
  const templateSnapshot = buildTemplateSnapshot(parent);
  const eventIds = [parent.id, ...parent.childEvents.map((child) => child.id)];
  const nextGenerationAt = DateTime.fromJSDate(lastGeneratedAt).minus({ days: 1 }).toJSDate();

  await prisma.$transaction(async (tx) => {
    await tx.eventSeries.upsert({
      where: { id: seriesId },
      create: {
        id: seriesId,
        organizerId: parent.organizerId,
        name: parent.title,
        recurrenceType: seriesConfig.recurrenceType,
        intervalDays: seriesConfig.intervalDays,
        daysOfWeek: [],
        time: getTimeInZone(parent.startsAt),
        timezone: APP_DEFAULT_TIMEZONE,
        durationMinutes: getDurationMinutes(parent),
        startDate: parent.startsAt,
        endDate: null,
        nextGenerationAt,
        lastGeneratedAt,
        bufferDays: 30,
        autoCoverImage: false,
        templateSnapshot,
        isActive: true,
      },
      update: {
        organizerId: parent.organizerId,
        name: parent.title,
        recurrenceType: seriesConfig.recurrenceType,
        intervalDays: seriesConfig.intervalDays,
        daysOfWeek: [],
        time: getTimeInZone(parent.startsAt),
        timezone: APP_DEFAULT_TIMEZONE,
        durationMinutes: getDurationMinutes(parent),
        startDate: parent.startsAt,
        endDate: null,
        nextGenerationAt,
        lastGeneratedAt,
        bufferDays: 30,
        autoCoverImage: false,
        templateSnapshot,
        isActive: true,
      },
    });

    await tx.event.updateMany({
      where: { id: { in: eventIds } },
      data: { seriesId },
    });
  });

  return parent.seriesId ? 'updated' : 'created';
}

export async function runEventSeriesBackfill(
  prismaClient?: PrismaClient,
): Promise<BackfillSummary> {
  const prisma = prismaClient ?? new PrismaClient();
  const shouldDisconnect = !prismaClient;

  console.log('Rozpoczynam backfill serii wydarzeń...');

  try {
    const parents = await prisma.event.findMany({
      where: {
        isRecurring: true,
        parentEventId: null,
      },
      include: {
        childEvents: {
          select: {
            id: true,
            startsAt: true,
            seriesId: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    if (parents.length === 0) {
      console.log('Brak rekordów do backfillu.');
      return { parents: 0, created: 0, updated: 0, skipped: 0 };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const parent of parents) {
      try {
        const result = await backfillSeriesForParent(prisma, parent);
        if (result === 'created') {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }

        console.log(
          `OK: ${parent.id} -> seriesId=${getSeriesId(parent.id, parent.seriesId)} (${result})`,
        );
      } catch (error) {
        skippedCount += 1;
        console.warn(`Pominięto ${parent.id}: ${(error as Error).message}`);
      }
    }

    console.log('Backfill serii zakończony.');
    console.log(
      `Podsumowanie: parents=${parents.length}, created=${createdCount}, updated=${updatedCount}, skipped=${skippedCount}`,
    );

    return {
      parents: parents.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
    };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  runEventSeriesBackfill()
    .catch((error) => {
      console.error('Błąd krytyczny podczas backfillu serii wydarzeń:', error);
      process.exit(1);
    })
    .finally(() => undefined);
}
