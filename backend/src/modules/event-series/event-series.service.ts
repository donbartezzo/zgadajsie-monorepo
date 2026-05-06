import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import {
  APP_DEFAULT_TIMEZONE,
  EventSeriesRecurrenceType,
  previewSeriesDates,
  EVENT_SERIES_PREVIEW_COUNT,
} from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SlotService } from '../slots/slot.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { PushService } from '../notifications/push.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { isAdminUser } from '../auth/utils/auth-user.util';
import { EventSeriesGenerator } from './event-series.generator';
import { CreateEventSeriesDto } from './dto/create-event-series.dto';
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
  ) {}

  async createSeries(organizerId: string, dto: CreateEventSeriesDto) {
    this.validateRecurrenceConfig(dto);

    const timezone = dto.timezone || APP_DEFAULT_TIMEZONE;
    const bufferDays = dto.bufferDays ?? 30;

    const templateSnapshot = {
      title: dto.title,
      description: dto.description,
      disciplineSlug: dto.disciplineSlug,
      facilitySlug: dto.facilitySlug,
      levelSlug: dto.levelSlug,
      citySlug: dto.citySlug,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      costPerPerson: dto.costPerPerson,
      minParticipants: dto.minParticipants,
      maxParticipants: dto.maxParticipants,
      ageMin: dto.ageMin,
      ageMax: dto.ageMax,
      gender: dto.gender,
      visibility: dto.visibility,
      coverImageId: dto.coverImageId,
      rules: dto.rules,
      facilityReserved: dto.facilityReserved ?? true,
      roleConfig: dto.roleConfig ? JSON.parse(JSON.stringify(dto.roleConfig)) : null,
    };

    if (dto.roleConfig) {
      this.validateRoleConfig(dto.roleConfig, dto.maxParticipants);
    }

    const series = await this.prisma.eventSeries.create({
      data: {
        organizerId,
        name: dto.name,
        recurrenceType: dto.recurrenceType,
        intervalDays:
          dto.recurrenceType === EventSeriesRecurrenceType.INTERVAL ? dto.intervalDays : null,
        daysOfWeek:
          dto.recurrenceType === EventSeriesRecurrenceType.WEEKLY ? (dto.daysOfWeek ?? []) : [],
        time: dto.time,
        timezone,
        durationMinutes: dto.durationMinutes,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        bufferDays,
        autoCoverImage: dto.autoCoverImage ?? false,
        templateSnapshot,
        isActive: true,
        nextGenerationAt: new Date(),
      },
    });

    await this.generator.generateForSeries(series.id);

    const seriesWithEvents = await this.prisma.eventSeries.findUniqueOrThrow({
      where: { id: series.id },
      include: {
        events: {
          where: { status: EventStatus.ACTIVE },
          orderBy: { startsAt: 'asc' },
          take: 10,
        },
      },
    });

    const firstEvent = seriesWithEvents.events[0];
    if (firstEvent) {
      this.notifyCitySubscribers(firstEvent.id, firstEvent.title, firstEvent.citySlug, organizerId);
    }

    return seriesWithEvents;
  }

  async findOne(id: string, userId?: string) {
    const series = await this.prisma.eventSeries.findUnique({
      where: { id },
      include: {
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

    const updatedTemplateSnapshot = dto.title
      ? {
          ...(series.templateSnapshot as object),
          title: dto.title ?? undefined,
          description: dto.description,
          disciplineSlug: dto.disciplineSlug,
          facilitySlug: dto.facilitySlug,
          levelSlug: dto.levelSlug,
          citySlug: dto.citySlug,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          costPerPerson: dto.costPerPerson,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          ageMin: dto.ageMin,
          ageMax: dto.ageMax,
          gender: dto.gender,
          visibility: dto.visibility,
          coverImageId: dto.coverImageId,
          rules: dto.rules,
          facilityReserved: dto.facilityReserved,
          roleConfig: dto.roleConfig ? JSON.parse(JSON.stringify(dto.roleConfig)) : undefined,
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

  private validateRecurrenceConfig(dto: CreateEventSeriesDto) {
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
    organizerId: string,
  ): void {
    setImmediate(async () => {
      try {
        const subscriberIds = await this.citySubscriptionsService.getSubscriberIds(citySlug);
        const filtered = subscriberIds.filter((id) => id !== organizerId);
        for (const userId of filtered) {
          await this.pushService.notifyNewEventInCity(userId, eventTitle, eventId);
        }
      } catch (err) {
        this.logger.error(`Failed to notify city subscribers: ${(err as Error).message}`);
      }
    });
  }
}
