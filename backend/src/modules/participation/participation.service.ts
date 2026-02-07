import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipationService {
  constructor(private prisma: PrismaService) {}

  async join(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.status !== 'ACTIVE') throw new BadRequestException('Wydarzenie nie jest aktywne');
    if (event.organizerId === userId) throw new BadRequestException('Organizator nie może dołączyć do własnego wydarzenia');

    const existing = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');

    if (event.maxParticipants) {
      const count = await this.prisma.eventParticipation.count({
        where: { eventId, status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT'] } },
      });
      if (count >= event.maxParticipants) throw new BadRequestException('Wydarzenie jest pełne');
    }

    const status = event.autoAccept ? 'ACCEPTED' : 'APPLIED';

    return this.prisma.eventParticipation.create({
      data: { eventId, userId, status },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async joinGuest(eventId: string, addedByUserId: string, displayName: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    const guestCount = await this.prisma.eventParticipation.count({
      where: { eventId, addedByUserId, isGuest: true },
    });
    if (guestCount >= 2) throw new BadRequestException('Możesz dodać maksymalnie 2 gości');

    const guestUser = await this.prisma.user.create({
      data: {
        email: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@guest.zgadajsie.pl`,
        displayName,
        isActive: false,
      },
    });

    return this.prisma.eventParticipation.create({
      data: {
        eventId,
        userId: guestUser.id,
        addedByUserId,
        isGuest: true,
        status: 'APPLIED',
      },
    });
  }

  async accept(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Zgłoszenie nie znalezione');
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    return this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'ACCEPTED' },
    });
  }

  async reject(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Zgłoszenie nie znalezione');
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    return this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async leave(eventId: string, userId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');

    // TODO: refund logic if >3h before event

    return this.prisma.eventParticipation.update({
      where: { id: participation.id },
      data: { status: 'WITHDRAWN' },
    });
  }
}
