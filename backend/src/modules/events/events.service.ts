import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CoverImagesService } from '../cover-images/cover-images.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    private vouchersService: VouchersService,
    private coverImagesService: CoverImagesService,
  ) {}

  async create(organizerId: string, dto: CreateEventDto) {
    const coverImageId = await this.resolveCoverImageId(dto.coverImageId, dto.disciplineId);

    return this.prisma.event.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        organizerId,
        coverImageId,
      },
      include: { discipline: true, facility: true, level: true, city: true, coverImage: true },
    });
  }

  async findAll(query: EventQueryDto) {
    const { page = 1, limit = 20, citySlug, disciplineSlug, sortBy } = query;
    const where: Record<string, unknown> = { status: 'ACTIVE', visibility: 'PUBLIC' };

    if (citySlug) {
      where.city = { slug: citySlug };
    }
    if (disciplineSlug) {
      where.discipline = { slug: disciplineSlug };
    }

    const orderBy: Record<string, string> =
      sortBy === 'newest' ? { createdAt: 'desc' } : { startsAt: 'asc' };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          discipline: true,
          facility: true,
          level: true,
          city: true,
          coverImage: true,
          organizer: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { participations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data: events, total, page, limit };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        discipline: true,
        facility: true,
        level: true,
        city: true,
        coverImage: true,
        organizer: { select: { id: true, displayName: true, avatarUrl: true } },
        participations: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    if (!userId) return event;

    const participation = event.participations.find((p) => p.userId === userId);

    return {
      ...event,
      currentUserAccess: {
        isParticipant: !!participation,
        isOrganizer: event.organizerId === userId,
        participationStatus: participation?.status ?? null,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);

    return this.prisma.event.update({
      where: { id },
      data,
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async cancel(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Auto voucher refund for paid participants
    const refundedCount = await this.vouchersService.bulkCreateForCancelledEvent(id);

    // Notify all active participants about cancellation
    const participants = await this.prisma.eventParticipation.findMany({
      where: { eventId: id, status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT', 'WITHDRAWN'] } },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    for (const p of participants) {
      await this.pushService.notifyEventCancelled(p.user.id, event.title, id);
      await this.emailService.sendEventCancelledEmail(
        p.user.email,
        p.user.displayName,
        event.title,
      );
    }

    return { ...updated, refundedParticipants: refundedCount };
  }

  async archive(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async duplicate(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, updatedAt: _ua, status: _st, ...rest } = event;
    return this.prisma.event.create({
      data: {
        ...rest,
        status: 'ACTIVE',
        costPerPerson: rest.costPerPerson,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    return this.prisma.event.delete({ where: { id } });
  }

  async toggleAutoAccept(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    return this.prisma.event.update({
      where: { id },
      data: { autoAccept: !event.autoAccept },
    });
  }

  async getParticipants(eventId: string) {
    return this.prisma.eventParticipation.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSeries(organizerId: string, dto: CreateEventDto) {
    if (!dto.isRecurring || !dto.recurringRule) {
      return this.create(organizerId, dto);
    }

    const dates = this.generateRecurringDates(
      new Date(dto.startsAt),
      new Date(dto.endsAt),
      dto.recurringRule,
    );

    // Create parent event
    const parent = await this.prisma.event.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        organizerId,
        isRecurring: true,
        recurringRule: dto.recurringRule,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });

    // Create child instances
    for (const { start, end } of dates.slice(1)) {
      await this.prisma.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          disciplineId: dto.disciplineId,
          facilityId: dto.facilityId,
          levelId: dto.levelId,
          cityId: dto.cityId,
          startsAt: start,
          endsAt: end,
          costPerPerson: dto.costPerPerson,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          ageMin: dto.ageMin,
          ageMax: dto.ageMax,
          gender: dto.gender,
          visibility: dto.visibility,
          autoAccept: dto.autoAccept,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          coverImageId: dto.coverImageId,
          organizerId,
          isRecurring: true,
          recurringRule: dto.recurringRule,
          parentEventId: parent.id,
        },
      });
    }

    return parent;
  }

  async updateSeries(id: string, userId: string, dto: UpdateEventDto) {
    const parent = await this.update(id, userId, dto);

    // Update all child events in the series
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.disciplineId !== undefined) data.disciplineId = dto.disciplineId;
    if (dto.facilityId !== undefined) data.facilityId = dto.facilityId;
    if (dto.levelId !== undefined) data.levelId = dto.levelId;
    if (dto.cityId !== undefined) data.cityId = dto.cityId;
    if (dto.costPerPerson !== undefined) data.costPerPerson = dto.costPerPerson;
    if (dto.maxParticipants !== undefined) data.maxParticipants = dto.maxParticipants;
    if (dto.autoAccept !== undefined) data.autoAccept = dto.autoAccept;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.lat !== undefined) data.lat = dto.lat;
    if (dto.lng !== undefined) data.lng = dto.lng;

    if (Object.keys(data).length > 0) {
      await this.prisma.event.updateMany({
        where: { parentEventId: id, status: 'ACTIVE' },
        data,
      });
    }

    return parent;
  }

  private async resolveCoverImageId(
    coverImageId: string | undefined,
    disciplineId: string,
  ): Promise<string | undefined> {
    if (coverImageId) {
      return coverImageId;
    }
    const random = await this.coverImagesService.findRandomByDiscipline(disciplineId);
    return random?.id;
  }

  private generateRecurringDates(
    startsAt: Date,
    endsAt: Date,
    rule: string,
  ): { start: Date; end: Date }[] {
    const duration = endsAt.getTime() - startsAt.getTime();
    const dates: { start: Date; end: Date }[] = [];
    const maxInstances = 52; // max 1 year of weekly events

    let intervalDays = 7; // default weekly
    if (rule === 'DAILY') intervalDays = 1;
    else if (rule === 'BIWEEKLY') intervalDays = 14;
    else if (rule === 'MONTHLY') intervalDays = 30;

    for (let i = 0; i < maxInstances; i++) {
      const start = new Date(startsAt.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + duration);
      dates.push({ start, end });
    }

    return dates;
  }
}
