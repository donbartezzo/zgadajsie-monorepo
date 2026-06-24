import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  APP_DEFAULT_TIMEZONE,
  EventSeriesRecurrenceType,
  previewSeriesDates,
  EVENT_SERIES_PREVIEW_COUNT,
  FAKE_USERS_FINAL_CLEANUP_HOURS_DEFAULT,
  FAKE_USERS_MIN_FREE_SLOTS_BUFFER_DEFAULT,
} from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SlotService } from '../slots/slot.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { PushService } from '../notifications/push.service';
import { FakeUsersMonitorService } from '../fake-users/fake-users-monitor.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { isAdminUser } from '../auth/utils/auth-user.util';
import { EventSeriesGenerator } from './event-series.generator';
import { CreateSeriesFromEventDto } from './dto/create-series-from-event.dto';
import { UpdateEventSeriesDto } from './dto/update-event-series.dto';
import { PreviewEventSeriesDto } from './dto/preview-event-series.dto';

const SERIES_NOT_FOUND = 'Seria wydarzeń nie została znaleziona';
const NOT_SERIES_ORGANIZER = 'Nie jesteś organizatorem tej serii';

@Injectable()
export class EventSeriesService {
  private readonly logger = new Logger(EventSeriesService.name);

  constructor(
    private prisma: PrismaService,
    private slotService: SlotService,
    private generator: EventSeriesGenerator,
    private citySubscriptionsService: CitySubscriptionsService,
    private pushService: PushService,
    private fakeUsersMonitor: FakeUsersMonitorService,
  ) {}

  async createSeriesFromEvent(organizerId: string, eventId: string, dto: CreateSeriesFromEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        city: true,
        coverImage: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie zostało znalezione');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    if (event.seriesId !== null) {
      throw new BadRequestException('To wydarzenie już należy do serii');
    }

    const timezone = dto.timezone || APP_DEFAULT_TIMEZONE;
    const bufferDays = dto.bufferDays ?? 30;

    // Wyprowadź time/durationMinutes/startDate z wydarzenia jeśli nie podane
    const eventStart = DateTime.fromJSDate(event.startsAt, { zone: timezone });
    const eventEnd = DateTime.fromJSDate(event.endsAt, { zone: timezone });

    const time = dto.time ?? eventStart.toFormat('HH:mm');
    const durationMinutes =
      dto.durationMinutes ?? Math.round(eventEnd.diff(eventStart, 'minutes').minutes);
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : eventStart.startOf('day').toJSDate();

    const templateSnapshot = {
      title: event.title,
      description: event.description,
      disciplineSlug: event.disciplineSlug,
      facilitySlug: event.facilitySlug,
      levelSlug: event.levelSlug,
      citySlug: event.citySlug,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      costPerPerson: event.costPerPerson ? Number(event.costPerPerson) : undefined,
      minParticipants: event.minParticipants ?? undefined,
      maxParticipants: event.maxParticipants,
      ageMin: event.ageMin ?? undefined,
      ageMax: event.ageMax ?? undefined,
      gender: event.gender,
      visibility: event.visibility,
      coverImageId: event.coverImageId ?? undefined,
      rules: event.rules ?? undefined,
      facilityReserved: event.facilityReserved,
      welcomeMessageEnabled: event.welcomeMessageEnabled,
      roleConfig: event.roleConfig ? JSON.parse(JSON.stringify(event.roleConfig)) : null,
    };

    if (event.roleConfig) {
      this.validateRoleConfig(
        event.roleConfig as { roles: { slots: number; isDefault: boolean }[] },
        event.maxParticipants,
      );
    }

    const series = await this.prisma.$transaction(async (tx) => {
      const created = await tx.eventSeries.create({
        data: {
          organizerId,
          name: dto.name,
          recurrenceType: dto.recurrenceType,
          intervalDays:
            dto.recurrenceType === EventSeriesRecurrenceType.INTERVAL ? dto.intervalDays : null,
          daysOfWeek:
            dto.recurrenceType === EventSeriesRecurrenceType.WEEKLY ? (dto.daysOfWeek ?? []) : [],
          time,
          timezone,
          durationMinutes,
          startDate,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          bufferDays,
          autoCoverImage: dto.autoCoverImage ?? false,
          templateSnapshot,
          isActive: true,
          sourceEventId: eventId,
          nextGenerationAt: new Date(),
          targetOccupancyConfig: dto.targetOccupancy
            ? {
                create: {
                  targetOccupancy: dto.targetOccupancy,
                  cleanupHours: dto.cleanupHours ?? FAKE_USERS_FINAL_CLEANUP_HOURS_DEFAULT,
                  minFreeSlotsBuffer:
                    dto.minFreeSlotsBuffer ?? FAKE_USERS_MIN_FREE_SLOTS_BUFFER_DEFAULT,
                },
              }
            : undefined,
        },
      });

      await tx.event.update({
        where: { id: eventId },
        data: { seriesId: created.id },
      });

      return created;
    });

    await this.generator.generateForSeries(series.id);

    const seriesWithEvents = await this.prisma.eventSeries.findUniqueOrThrow({
      where: { id: series.id },
      include: {
        events: {
          where: { status: EventStatus.ACTIVE },
          orderBy: { startsAt: 'asc' },
          take: 10,
          include: { city: true },
        },
      },
    });

    const firstEvent = seriesWithEvents.events[0];
    if (firstEvent) {
      this.notifyCitySubscribers(
        firstEvent.id,
        firstEvent.title,
        firstEvent.citySlug,
        firstEvent.city.slug,
        organizerId,
      );
    }

    return seriesWithEvents;
  }

  async findOne(id: string, userId?: string) {
    const series = await this.prisma.eventSeries.findUnique({
      where: { id },
      include: {
        targetOccupancyConfig: true,
        events: {
          where: {
            status: { in: [EventStatus.ACTIVE, EventStatus.PENDING] },
            startsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'asc' },
          take: 30,
          include: {
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    if (!series) throw new NotFoundException(SERIES_NOT_FOUND);

    if (userId && series.organizerId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException(NOT_SERIES_ORGANIZER);
      }
    }

    return series;
  }

  async findMySeries(organizerId: string) {
    return this.prisma.eventSeries.findMany({
      where: { organizerId },
      include: {
        events: {
          where: {
            status: { in: [EventStatus.ACTIVE, EventStatus.PENDING] },
            startsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, user: AuthUser, dto: UpdateEventSeriesDto) {
    const series = await this.prisma.eventSeries.findUnique({ where: { id } });
    if (!series) throw new NotFoundException(SERIES_NOT_FOUND);

    if (series.organizerId !== user.id && !isAdminUser(user)) {
      throw new ForbiddenException(NOT_SERIES_ORGANIZER);
    }

    if (dto.roleConfig) {
      this.validateRoleConfig(dto.roleConfig, dto.maxParticipants ?? series.durationMinutes);
    }

    const now = new Date();

    // Usuń przyszłe eventy bez zapisów (ACTIVE i PENDING)
    await this.prisma.event.deleteMany({
      where: {
        seriesId: id,
        startsAt: { gt: now },
        status: { in: [EventStatus.ACTIVE, EventStatus.PENDING] },
        enrollments: { none: {} },
      },
    });

    const templateKeys = [
      'title',
      'description',
      'disciplineSlug',
      'facilitySlug',
      'levelSlug',
      'citySlug',
      'address',
      'lat',
      'lng',
      'costPerPerson',
      'minParticipants',
      'maxParticipants',
      'ageMin',
      'ageMax',
      'gender',
      'visibility',
      'coverImageId',
      'rules',
      'facilityReserved',
      'roleConfig',
    ] as const;

    const hasTemplateField = templateKeys.some(
      (key) => (dto as Record<string, unknown>)[key] !== undefined,
    );

    const updatedTemplateSnapshot = hasTemplateField
      ? {
          ...(series.templateSnapshot as object),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.disciplineSlug !== undefined && { disciplineSlug: dto.disciplineSlug }),
          ...(dto.facilitySlug !== undefined && { facilitySlug: dto.facilitySlug }),
          ...(dto.levelSlug !== undefined && { levelSlug: dto.levelSlug }),
          ...(dto.citySlug !== undefined && { citySlug: dto.citySlug }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.lat !== undefined && { lat: dto.lat }),
          ...(dto.lng !== undefined && { lng: dto.lng }),
          ...(dto.costPerPerson !== undefined && { costPerPerson: dto.costPerPerson }),
          ...(dto.minParticipants !== undefined && { minParticipants: dto.minParticipants }),
          ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
          ...(dto.ageMin !== undefined && { ageMin: dto.ageMin }),
          ...(dto.ageMax !== undefined && { ageMax: dto.ageMax }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.coverImageId !== undefined && { coverImageId: dto.coverImageId }),
          ...(dto.rules !== undefined && { rules: dto.rules }),
          ...(dto.facilityReserved !== undefined && { facilityReserved: dto.facilityReserved }),
          ...(dto.roleConfig !== undefined && {
            roleConfig: JSON.parse(JSON.stringify(dto.roleConfig)),
          }),
        }
      : undefined;

    await this.prisma.eventSeries.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.recurrenceType !== undefined && { recurrenceType: dto.recurrenceType }),
        ...(dto.intervalDays !== undefined && { intervalDays: dto.intervalDays }),
        ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.time !== undefined && { time: dto.time }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.bufferDays !== undefined && { bufferDays: dto.bufferDays }),
        ...(dto.autoCoverImage !== undefined && { autoCoverImage: dto.autoCoverImage }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(updatedTemplateSnapshot && { templateSnapshot: updatedTemplateSnapshot }),
        nextGenerationAt: now,
      },
    });

    // Propagacja fake users config na przyszłe wydarzenia serii
    const fakeConfigChanged =
      dto.targetOccupancy !== undefined ||
      dto.cleanupHours !== undefined ||
      dto.minFreeSlotsBuffer !== undefined;

    if (fakeConfigChanged) {
      const normalizedTarget =
        dto.targetOccupancy === 0 || dto.targetOccupancy === null ? null : dto.targetOccupancy;

      if (normalizedTarget === null && dto.targetOccupancy !== undefined) {
        // Wyłącz: usuń config serii i wszystkich przyszłych wydarzeń
        await this.prisma.eventSeriesTargetOccupancyConfig.deleteMany({ where: { seriesId: id } });
        await this.prisma.eventTargetOccupancyConfig.deleteMany({
          where: { event: { seriesId: id, startsAt: { gt: now } } },
        });
      } else if (normalizedTarget !== undefined && normalizedTarget !== null) {
        // Włącz/zaktualizuj config serii
        const configData = {
          targetOccupancy: normalizedTarget,
          cleanupHours: dto.cleanupHours ?? FAKE_USERS_FINAL_CLEANUP_HOURS_DEFAULT,
          minFreeSlotsBuffer: dto.minFreeSlotsBuffer ?? FAKE_USERS_MIN_FREE_SLOTS_BUFFER_DEFAULT,
        };
        await this.prisma.eventSeriesTargetOccupancyConfig.upsert({
          where: { seriesId: id },
          create: { seriesId: id, ...configData },
          update: configData,
        });

        // Propaguj na przyszłe wydarzenia (delete + re-insert)
        const futureEventIds = await this.prisma.event.findMany({
          where: { seriesId: id, startsAt: { gt: now } },
          select: { id: true },
        });
        const ids = futureEventIds.map((e) => e.id);

        if (ids.length > 0) {
          await this.prisma.eventTargetOccupancyConfig.deleteMany({
            where: { eventId: { in: ids } },
          });
          await this.prisma.eventTargetOccupancyConfig.createMany({
            data: ids.map((eventId) => ({ eventId, ...configData })),
          });
        }
      } else {
        // Tylko cleanupHours/minFreeSlotsBuffer się zmienił — zaktualizuj istniejące
        const partialUpdate = {
          ...(dto.cleanupHours !== undefined && { cleanupHours: dto.cleanupHours }),
          ...(dto.minFreeSlotsBuffer !== undefined && {
            minFreeSlotsBuffer: dto.minFreeSlotsBuffer,
          }),
        };
        await this.prisma.eventSeriesTargetOccupancyConfig.updateMany({
          where: { seriesId: id },
          data: partialUpdate,
        });
        await this.prisma.eventTargetOccupancyConfig.updateMany({
          where: { event: { seriesId: id, startsAt: { gt: now } } },
          data: partialUpdate,
        });
      }

      // Trigger monitora dla aktywnych przyszłych wydarzeń
      if (dto.targetOccupancy !== undefined) {
        const normalizedForMonitor =
          dto.targetOccupancy === 0 ? null : (dto.targetOccupancy ?? null);
        const activeEvents = await this.prisma.event.findMany({
          where: { seriesId: id, startsAt: { gt: now }, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const event of activeEvents) {
          await this.fakeUsersMonitor.handleTargetOccupancyChange(event.id, normalizedForMonitor);
        }
      }
    }

    await this.generator.generateForSeries(id);

    return this.findOne(id, user.id);
  }

  async deactivate(id: string, user: AuthUser) {
    const series = await this.prisma.eventSeries.findUnique({ where: { id } });
    if (!series) throw new NotFoundException(SERIES_NOT_FOUND);

    if (series.organizerId !== user.id && !isAdminUser(user)) {
      throw new ForbiddenException(NOT_SERIES_ORGANIZER);
    }

    const now = new Date();

    const deleted = await this.prisma.event.deleteMany({
      where: {
        seriesId: id,
        startsAt: { gt: now },
        status: { in: [EventStatus.ACTIVE, EventStatus.PENDING] },
        enrollments: { none: {} },
      },
    });

    const remaining = await this.prisma.event.count({
      where: { seriesId: id, startsAt: { gt: now }, status: EventStatus.ACTIVE },
    });

    await this.prisma.eventSeries.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      deactivated: true,
      deletedFutureEvents: deleted.count,
      remainingEventsWithEnrollments: remaining,
    };
  }

  async confirmEvent(seriesId: string, eventId: string, user: AuthUser) {
    const series = await this.prisma.eventSeries.findUnique({ where: { id: seriesId } });
    if (!series) throw new NotFoundException(SERIES_NOT_FOUND);

    if (series.organizerId !== user.id && !isAdminUser(user)) {
      throw new ForbiddenException(NOT_SERIES_ORGANIZER);
    }

    return this.activateEvent(eventId, seriesId);
  }

  async confirmEventByToken(token: string) {
    const event = await this.prisma.event.findUnique({
      where: { confirmToken: token },
      select: { id: true, seriesId: true, status: true, title: true },
    });

    if (!event || !event.seriesId) {
      throw new NotFoundException('Token potwierdzenia nie istnieje lub wygasł');
    }

    if (event.status === EventStatus.ACTIVE) {
      return { confirmed: true, eventId: event.id, title: event.title, alreadyConfirmed: true };
    }

    return this.activateEvent(event.id, event.seriesId);
  }

  private async activateEvent(eventId: string, seriesId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, title: true, seriesId: true },
    });

    if (!event) throw new NotFoundException('Wydarzenie nie zostało znalezione');
    if (event.seriesId !== seriesId)
      throw new NotFoundException('Wydarzenie nie należy do tej serii');

    await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.ACTIVE, confirmToken: null },
    });

    await this.resumeSeriesIfNeeded(seriesId);

    return { confirmed: true, eventId: event.id, title: event.title, alreadyConfirmed: false };
  }

  private async resumeSeriesIfNeeded(seriesId: string): Promise<void> {
    const series = await this.prisma.eventSeries.findUnique({
      where: { id: seriesId },
      select: { suspendedReason: true },
    });

    if (!series?.suspendedReason) return;

    const recentEvents = await this.prisma.event.findMany({
      where: { seriesId },
      select: { status: true },
      orderBy: { startsAt: 'desc' },
      take: 3,
    });

    const allPending = recentEvents.every((e) => e.status === EventStatus.PENDING);
    if (!allPending) {
      await this.prisma.eventSeries.update({
        where: { id: seriesId },
        data: {
          suspendedReason: null,
          suspendedAt: null,
          nextGenerationAt: new Date(),
        },
      });
    }
  }

  previewDates(dto: PreviewEventSeriesDto) {
    const timezone = dto.timezone || APP_DEFAULT_TIMEZONE;
    const count = dto.count ?? EVENT_SERIES_PREVIEW_COUNT;

    const config =
      dto.recurrenceType === EventSeriesRecurrenceType.INTERVAL
        ? { type: EventSeriesRecurrenceType.INTERVAL as const, intervalDays: dto.intervalDays ?? 7 }
        : { type: EventSeriesRecurrenceType.WEEKLY as const, daysOfWeek: dto.daysOfWeek ?? [] };

    return previewSeriesDates(
      config,
      {
        time: dto.time,
        timezone,
        startDate: new Date(dto.startDate),
        durationMinutes: dto.durationMinutes,
      },
      count,
    );
  }

  private validateRecurrenceConfig(dto: {
    recurrenceType: EventSeriesRecurrenceType;
    intervalDays?: number;
    daysOfWeek?: number[];
  }) {
    if (
      dto.recurrenceType === EventSeriesRecurrenceType.INTERVAL &&
      (dto.intervalDays === undefined || dto.intervalDays < 1)
    ) {
      throw new BadRequestException('intervalDays jest wymagane dla trybu INTERVAL');
    }
    if (
      dto.recurrenceType === EventSeriesRecurrenceType.WEEKLY &&
      (!dto.daysOfWeek || dto.daysOfWeek.length === 0)
    ) {
      throw new BadRequestException(
        'daysOfWeek musi zawierać przynajmniej jeden dzień dla trybu WEEKLY',
      );
    }
  }

  private validateRoleConfig(
    roleConfig: { roles: { slots: number; isDefault: boolean }[] },
    maxParticipants: number | undefined,
  ) {
    if (!maxParticipants) return;
    const totalSlots = roleConfig.roles.reduce((sum, r) => sum + r.slots, 0);
    if (totalSlots !== maxParticipants) {
      throw new BadRequestException(
        `Suma slotów ról (${totalSlots}) musi być równa liczbie uczestników (${maxParticipants})`,
      );
    }
    const defaultRoles = roleConfig.roles.filter((r) => r.isDefault);
    if (defaultRoles.length !== 1) {
      throw new BadRequestException('Dokładnie jedna rola musi być oznaczona jako domyślna');
    }
  }

  private notifyCitySubscribers(
    eventId: string,
    eventTitle: string,
    citySlug: string,
    cityId: string,
    organizerId: string,
  ): void {
    setImmediate(async () => {
      try {
        const subscriberIds = await this.citySubscriptionsService.getSubscriberIds(citySlug);
        const filtered = subscriberIds.filter((id) => id !== organizerId);
        for (const userId of filtered) {
          await this.pushService.notifyNewEventInCity(userId, eventTitle, eventId, cityId);
        }
      } catch (err) {
        this.logger.error(`Failed to notify city subscribers: ${(err as Error).message}`);
      }
    });
  }

  async setTargetOccupancy(seriesId: string, targetOccupancy: number | null) {
    const series = await this.prisma.eventSeries.findUnique({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException('Serie wydarzeń nie została znaleziona');
    }

    const normalized = !targetOccupancy || targetOccupancy === 0 ? null : targetOccupancy;

    if (normalized !== null && (normalized < 1 || normalized > 100)) {
      throw new BadRequestException('targetOccupancy musi być między 0 a 100 (null = wyłączone)');
    }

    const now = new Date();

    if (normalized === null) {
      await this.prisma.eventSeriesTargetOccupancyConfig.deleteMany({ where: { seriesId } });
      await this.prisma.eventTargetOccupancyConfig.deleteMany({
        where: { event: { seriesId, startsAt: { gt: now } } },
      });
    } else {
      await this.prisma.eventSeriesTargetOccupancyConfig.upsert({
        where: { seriesId },
        create: { seriesId, targetOccupancy: normalized },
        update: { targetOccupancy: normalized },
      });

      const seriesConfig = await this.prisma.eventSeriesTargetOccupancyConfig.findUnique({
        where: { seriesId },
      });

      const futureEventIds = await this.prisma.event.findMany({
        where: { seriesId, startsAt: { gt: now } },
        select: { id: true },
      });
      const ids = futureEventIds.map((e) => e.id);

      if (ids.length > 0 && seriesConfig) {
        await this.prisma.eventTargetOccupancyConfig.deleteMany({
          where: { eventId: { in: ids } },
        });
        await this.prisma.eventTargetOccupancyConfig.createMany({
          data: ids.map((eventId) => ({
            eventId,
            targetOccupancy: normalized,
            cleanupHours: seriesConfig.cleanupHours,
            minFreeSlotsBuffer: seriesConfig.minFreeSlotsBuffer,
          })),
        });
      }
    }

    const activeEvents = await this.prisma.event.findMany({
      where: { seriesId, startsAt: { gt: now }, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const event of activeEvents) {
      await this.fakeUsersMonitor.handleTargetOccupancyChange(event.id, normalized);
    }

    return this.prisma.eventSeries.findUnique({
      where: { id: seriesId },
      include: { targetOccupancyConfig: true },
    });
  }
}
