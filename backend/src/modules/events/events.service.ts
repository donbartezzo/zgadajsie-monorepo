import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(organizerId: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        organizerId,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async findAll(query: EventQueryDto) {
    const { page = 1, limit = 20, citySlug, disciplineSlug, sortBy } = query;
    const where: any = { status: 'ACTIVE', visibility: 'PUBLIC' };

    if (citySlug) {
      where.city = { slug: citySlug };
    }
    if (disciplineSlug) {
      where.discipline = { slug: disciplineSlug };
    }

    const orderBy: any = sortBy === 'newest'
      ? { createdAt: 'desc' }
      : { startsAt: 'asc' };

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
          organizer: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { participations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data: events, total, page, limit };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        discipline: true,
        facility: true,
        level: true,
        city: true,
        organizer: { select: { id: true, displayName: true, avatarUrl: true } },
        participations: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    return event;
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const data: any = { ...dto };
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

    // TODO: refund participants, send notifications
    return this.prisma.event.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
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

    const { id: _id, createdAt, updatedAt, status, ...rest } = event;
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
}
