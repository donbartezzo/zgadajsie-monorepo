import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';

@Injectable()
export class ParticipationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  async join(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.status !== 'ACTIVE') throw new BadRequestException('Wydarzenie nie jest aktywne');
    if (event.organizerId === userId)
      throw new BadRequestException('Organizator nie może dołączyć do własnego wydarzenia');

    const existing = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing && existing.status === 'WITHDRAWN') {
      const newStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';
      return this.prisma.eventParticipation.update({
        where: { id: existing.id },
        data: { status: newStatus },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
    }
    if (existing) throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');

    if (event.maxParticipants) {
      const count = await this.prisma.eventParticipation.count({
        where: { eventId, status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT'] } },
      });
      if (count >= event.maxParticipants) throw new BadRequestException('Wydarzenie jest pełne');
    }

    const status = event.autoAccept ? 'ACCEPTED' : 'APPLIED';

    const participation = await this.prisma.eventParticipation.create({
      data: { eventId, userId, status },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
    });

    // Notify organizer about new application
    const organizer = await this.prisma.user.findUnique({
      where: { id: event.organizerId },
      select: { id: true, email: true, displayName: true },
    });
    if (organizer) {
      await this.pushService.notifyNewApplication(
        organizer.id,
        participation.user.displayName,
        event.title,
        eventId,
      );
      await this.emailService.sendNewApplicationEmail(
        organizer.email,
        organizer.displayName,
        participation.user.displayName,
        event.title,
      );
    }

    return participation;
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

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'ACCEPTED' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    await this.pushService.notifyParticipationStatus(
      updated.userId,
      updated.event.title,
      'ACCEPTED',
      updated.eventId,
    );
    await this.emailService.sendParticipationStatusEmail(
      updated.user.email,
      updated.user.displayName,
      updated.event.title,
      'ACCEPTED',
    );

    return updated;
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

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'WITHDRAWN' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    await this.pushService.notifyParticipationStatus(
      updated.userId,
      updated.event.title,
      'REJECTED',
      updated.eventId,
    );
    await this.emailService.sendParticipationStatusEmail(
      updated.user.email,
      updated.user.displayName,
      updated.event.title,
      'REJECTED',
    );

    return updated;
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
