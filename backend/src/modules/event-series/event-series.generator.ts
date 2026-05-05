import { Injectable, Logger } from '@nestjs/common';
import { EventSeries, EventStatus, EventGender, EventVisibility } from '@prisma/client';
import {
  APP_DEFAULT_TIMEZONE,
  EventSeriesRecurrenceType,
  computeNextDates,
} from '@zgadajsie/shared';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { SlotService } from '../slots/slot.service';
import { CoverImagesService } from '../cover-images/cover-images.service';

type TemplateSnapshot = {
  title: string;
  description?: string;
  disciplineSlug: string;
  facilitySlug: string;
  levelSlug: string;
  citySlug: string;
  address: string;
  lat: number;
  lng: number;
  costPerPerson?: number;
  minParticipants?: number;
  maxParticipants: number;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  visibility?: string;
  coverImageId?: string;
  rules?: string;
  facilityReserved?: boolean;
  roleConfig?: unknown;
};

export interface GenerateResult {
  created: number;
  skipped: number;
}

@Injectable()
export class EventSeriesGenerator {
  private readonly logger = new Logger(EventSeriesGenerator.name);

  constructor(
    private prisma: PrismaService,
    private slotService: SlotService,
    private coverImagesService: CoverImagesService,
  ) {}

  async generateForSeries(seriesId: string): Promise<GenerateResult> {
    const series = await this.prisma.eventSeries.findUniqueOrThrow({ where: { id: seriesId } });

    if (!series.isActive) {
      return { created: 0, skipped: 0 };
    }

    const now = new Date();
    const windowEnd = DateTime.fromJSDate(now, { zone: series.timezone || APP_DEFAULT_TIMEZONE })
      .plus({ days: series.bufferDays })
      .toJSDate();

    if (series.endDate && series.endDate < now) {
      return { created: 0, skipped: 0 };
    }

    const until = series.endDate && series.endDate < windowEnd ? series.endDate : windowEnd;
    const from = series.lastGeneratedAt ?? series.startDate;

    const config = this.buildRecurrenceConfig(series);
    const dates = computeNextDates(config, {
      time: series.time,
      timezone: series.timezone || APP_DEFAULT_TIMEZONE,
      from,
      until,
    });

    if (dates.length === 0) {
      await this.prisma.eventSeries.update({
        where: { id: seriesId },
        data: {
          nextGenerationAt: DateTime.fromJSDate(windowEnd).minus({ days: 1 }).toJSDate(),
        },
      });
      return { created: 0, skipped: 0 };
    }

    const template = series.templateSnapshot as TemplateSnapshot;

    let excludeCoverIds: string[] = [];
    if (series.autoCoverImage) {
      const existing = await this.prisma.event.findMany({
        where: { seriesId, coverImageId: { not: null } },
        select: { coverImageId: true },
      });
      excludeCoverIds = existing
        .map((e) => e.coverImageId)
        .filter((id): id is string => Boolean(id));
    }

    const eventsToCreate = await this.buildEventRecords(series, template, dates, excludeCoverIds);

    const beforeCount = await this.prisma.event.count({
      where: { seriesId, startsAt: { in: dates } },
    });

    await this.prisma.event.createMany({ data: eventsToCreate, skipDuplicates: true });

    const newEvents = await this.prisma.event.findMany({
      where: {
        seriesId,
        startsAt: { in: dates },
        status: EventStatus.ACTIVE,
      },
      select: { id: true, startsAt: true },
      orderBy: { startsAt: 'asc' },
    });

    const createdCount = newEvents.length - beforeCount > 0 ? newEvents.length - beforeCount : 0;

    for (const event of newEvents) {
      try {
        await this.slotService.createSlotsForEvent(
          event.id,
          template.maxParticipants,
          (template.roleConfig as { roles: { key: string; slots: number }[] }) ?? null,
        );
      } catch {
        // Sloty mogą już istnieć jeśli event był wygenerowany wcześniej - ignorujemy
      }
    }

    const nextGenerationAt = DateTime.fromJSDate(windowEnd).minus({ days: 1 }).toJSDate();

    await this.prisma.eventSeries.update({
      where: { id: seriesId },
      data: {
        lastGeneratedAt: windowEnd,
        nextGenerationAt,
      },
    });

    this.logger.log(
      `Series ${seriesId}: generated ${createdCount} events, skipped ${dates.length - createdCount}`,
    );

    return { created: createdCount, skipped: dates.length - createdCount };
  }

  private buildRecurrenceConfig(series: EventSeries) {
    if (series.recurrenceType === EventSeriesRecurrenceType.INTERVAL) {
      return {
        type: EventSeriesRecurrenceType.INTERVAL as const,
        intervalDays: series.intervalDays ?? 7,
      };
    }
    return {
      type: EventSeriesRecurrenceType.WEEKLY as const,
      daysOfWeek: series.daysOfWeek ?? [],
    };
  }

  private async buildEventRecords(
    series: EventSeries,
    template: TemplateSnapshot,
    dates: Date[],
    excludeCoverIds: string[],
  ) {
    const records = [];

    for (const startsAt of dates) {
      const endsAt = new Date(startsAt.getTime() + series.durationMinutes * 60 * 1000);

      let coverImageId: string | undefined = template.coverImageId;

      if (series.autoCoverImage) {
        const cover = await this.coverImagesService.findSmartCoverForOrganizer(
          template.disciplineSlug,
          series.organizerId,
          template.citySlug,
          excludeCoverIds,
        );
        if (cover) {
          coverImageId = cover.id;
          excludeCoverIds.push(cover.id);
        }
      }

      records.push({
        title: template.title,
        description: template.description,
        disciplineSlug: template.disciplineSlug,
        facilitySlug: template.facilitySlug,
        levelSlug: template.levelSlug,
        citySlug: template.citySlug,
        organizerId: series.organizerId,
        address: template.address,
        lat: template.lat,
        lng: template.lng,
        costPerPerson: template.costPerPerson,
        minParticipants: template.minParticipants,
        maxParticipants: template.maxParticipants,
        ageMin: template.ageMin,
        ageMax: template.ageMax,
        gender: (template.gender ?? 'ANY') as EventGender,
        visibility: (template.visibility ?? 'PUBLIC') as EventVisibility,
        rules: template.rules,
        facilityReserved: template.facilityReserved ?? true,
        coverImageId: coverImageId ?? null,
        roleConfig: template.roleConfig
          ? JSON.parse(JSON.stringify(template.roleConfig))
          : undefined,
        seriesId: series.id,
        status: EventStatus.ACTIVE,
        startsAt,
        endsAt,
      });
    }

    return records;
  }
}
