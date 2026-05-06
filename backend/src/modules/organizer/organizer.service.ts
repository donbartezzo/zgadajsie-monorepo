import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface EventDigestItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  enrollmentCount: number;
  seriesId: string | null;
  seriesName: string | null;
  confirmToken: string | null;
}

export interface SeriesDigestItem {
  id: string;
  name: string;
  recurrenceType: string;
  isActive: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  pendingCount: number;
  nextEventAt: string | null;
}

export interface OrganizerDigestData {
  period: { from: string; to: string };
  pendingConfirmations: EventDigestItem[];
  recentlyCreated: EventDigestItem[];
  recentlyEnded: EventDigestItem[];
  upcoming: EventDigestItem[];
  recentlyCancelled: EventDigestItem[];
  activeSeries: SeriesDigestItem[];
  recentlyDeactivatedSeries: SeriesDigestItem[];
}

const DIGEST_PERIOD_DAYS = 30;
const UPCOMING_DAYS = 30;

@Injectable()
export class OrganizerService {
  constructor(private prisma: PrismaService) {}

  async getDigestData(organizerId: string): Promise<OrganizerDigestData> {
    const now = DateTime.now().setZone(APP_DEFAULT_TIMEZONE);
    const periodFrom = now.minus({ days: DIGEST_PERIOD_DAYS }).toJSDate();
    const upcomingUntil = now.plus({ days: UPCOMING_DAYS }).toJSDate();
    const nowDate = now.toJSDate();

    const [
      pendingConfirmations,
      recentlyCreated,
      recentlyEnded,
      upcoming,
      recentlyCancelled,
      activeSeries,
      recentlyDeactivatedSeries,
    ] = await Promise.all([
      this.getPendingConfirmations(organizerId),
      this.getRecentlyCreated(organizerId, periodFrom),
      this.getRecentlyEnded(organizerId, periodFrom, nowDate),
      this.getUpcoming(organizerId, nowDate, upcomingUntil),
      this.getRecentlyCancelled(organizerId, periodFrom),
      this.getActiveSeries(organizerId),
      this.getRecentlyDeactivatedSeries(organizerId, periodFrom),
    ]);

    return {
      period: {
        from: periodFrom.toISOString(),
        to: upcomingUntil.toISOString(),
      },
      pendingConfirmations,
      recentlyCreated,
      recentlyEnded,
      upcoming,
      recentlyCancelled,
      activeSeries,
      recentlyDeactivatedSeries,
    };
  }

  private async getPendingConfirmations(organizerId: string): Promise<EventDigestItem[]> {
    const events = await this.prisma.event.findMany({
      where: { organizerId, status: EventStatus.PENDING },
      select: this.eventSelect(),
      orderBy: { startsAt: 'asc' },
    });
    return events.map(this.toEventDigestItem);
  }

  private async getRecentlyCreated(organizerId: string, from: Date): Promise<EventDigestItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
        status: { in: [EventStatus.ACTIVE, EventStatus.PENDING] },
        createdAt: { gte: from },
      },
      select: this.eventSelect(),
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return events.map(this.toEventDigestItem);
  }

  private async getRecentlyEnded(
    organizerId: string,
    from: Date,
    now: Date,
  ): Promise<EventDigestItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
        status: EventStatus.ACTIVE,
        endsAt: { gte: from, lt: now },
      },
      select: this.eventSelect(),
      orderBy: { endsAt: 'desc' },
      take: 20,
    });
    return events.map(this.toEventDigestItem);
  }

  private async getUpcoming(
    organizerId: string,
    now: Date,
    until: Date,
  ): Promise<EventDigestItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
        status: EventStatus.ACTIVE,
        startsAt: { gte: now, lte: until },
      },
      select: this.eventSelect(),
      orderBy: { startsAt: 'asc' },
      take: 20,
    });
    return events.map(this.toEventDigestItem);
  }

  private async getRecentlyCancelled(organizerId: string, from: Date): Promise<EventDigestItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
        status: EventStatus.CANCELLED,
        updatedAt: { gte: from },
      },
      select: this.eventSelect(),
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return events.map(this.toEventDigestItem);
  }

  private async getActiveSeries(organizerId: string): Promise<SeriesDigestItem[]> {
    const series = await this.prisma.eventSeries.findMany({
      where: { organizerId, isActive: true },
      select: {
        id: true,
        name: true,
        recurrenceType: true,
        isActive: true,
        suspendedReason: true,
        suspendedAt: true,
        events: {
          where: { status: EventStatus.PENDING },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: SeriesDigestItem[] = [];

    for (const s of series) {
      const nextEvent = await this.prisma.event.findFirst({
        where: { seriesId: s.id, status: EventStatus.ACTIVE, startsAt: { gte: new Date() } },
        select: { startsAt: true },
        orderBy: { startsAt: 'asc' },
      });

      result.push({
        id: s.id,
        name: s.name,
        recurrenceType: s.recurrenceType,
        isActive: s.isActive,
        suspendedReason: s.suspendedReason,
        suspendedAt: s.suspendedAt?.toISOString() ?? null,
        pendingCount: s.events.length,
        nextEventAt: nextEvent?.startsAt.toISOString() ?? null,
      });
    }

    return result;
  }

  private async getRecentlyDeactivatedSeries(
    organizerId: string,
    from: Date,
  ): Promise<SeriesDigestItem[]> {
    const series = await this.prisma.eventSeries.findMany({
      where: { organizerId, isActive: false, updatedAt: { gte: from } },
      select: {
        id: true,
        name: true,
        recurrenceType: true,
        isActive: true,
        suspendedReason: true,
        suspendedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return series.map((s) => ({
      id: s.id,
      name: s.name,
      recurrenceType: s.recurrenceType,
      isActive: s.isActive,
      suspendedReason: s.suspendedReason,
      suspendedAt: s.suspendedAt?.toISOString() ?? null,
      pendingCount: 0,
      nextEventAt: null,
    }));
  }

  private eventSelect() {
    return {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      seriesId: true,
      confirmToken: true,
      series: { select: { name: true } },
      _count: { select: { enrollments: true } },
    } as const;
  }

  private toEventDigestItem(e: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: EventStatus;
    seriesId: string | null;
    confirmToken: string | null;
    series: { name: string } | null;
    _count: { enrollments: number };
  }): EventDigestItem {
    return {
      id: e.id,
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      status: e.status,
      enrollmentCount: e._count.enrollments,
      seriesId: e.seriesId,
      seriesName: e.series?.name ?? null,
      confirmToken: e.confirmToken,
    };
  }

  async hasOrganizedAnyEvents(userId: string): Promise<boolean> {
    const count = await this.prisma.event.count({
      where: { organizerId: userId },
      take: 1,
    });
    return count > 0;
  }
}
