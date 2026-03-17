import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { PaymentsService } from '../payments/payments.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { isEventJoinable } from '../events/event-time-status.util';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';

const USER_SELECT = { id: true, displayName: true, avatarUrl: true, email: true };
const MAX_GUESTS_PER_USER = 3;

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger(ParticipationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    private pushService: PushService,
    private paymentsService: PaymentsService,
    private eligibility: EnrollmentEligibilityService,
  ) {}

  async join(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.status !== 'ACTIVE') {
      throw new BadRequestException('Wydarzenie nie jest aktywne');
    }
    if (!isEventJoinable(event)) {
      throw new BadRequestException('Wydarzenie już się rozpoczęło - dołączenie nie jest możliwe');
    }

    const phase = getEnrollmentPhase(event);
    if (phase === 'LOTTERY_PENDING') {
      throw new BadRequestException('Trwa losowanie miejsc - spróbuj za chwilę');
    }

    const isPaid = event.costPerPerson.toNumber() > 0;

    const existing = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    // Rejoin after WITHDRAWN
    if (existing && existing.status === 'WITHDRAWN') {
      return this.handleRejoin(existing.id, event, userId, isPaid, phase);
    }
    if (existing) {
      throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');
    }

    // Organizer auto-confirmed
    if (event.organizerId === userId) {
      const participation = await this.prisma.eventParticipation.create({
        data: {
          eventId,
          userId,
          status: 'CONFIRMED',
          organizerPicked: true,
          approvedAt: new Date(),
        },
        include: { user: { select: USER_SELECT } },
      });
      return { ...participation, isPaid, costPerPerson: event.costPerPerson.toNumber() };
    }

    // PRE_ENROLLMENT: always PENDING
    if (phase === 'PRE_ENROLLMENT') {
      return this.createPending(eventId, userId, event, isPaid);
    }

    // OPEN_ENROLLMENT: depends on eligibility + slot availability
    return this.handleOpenEnrollmentJoin(eventId, userId, event, isPaid);
  }

  async joinGuest(eventId: string, addedByUserId: string, displayName: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (!isEventJoinable(event)) {
      throw new BadRequestException('Wydarzenie już się rozpoczęło - dołączenie nie jest możliwe');
    }

    const phase = getEnrollmentPhase(event);
    if (phase === 'LOTTERY_PENDING') {
      throw new BadRequestException('Trwa losowanie miejsc - spróbuj za chwilę');
    }

    // Only non-new users can add guests (organizer always can)
    if (addedByUserId !== event.organizerId) {
      const canAdd = await this.eligibility.canAddGuests(addedByUserId, event.organizerId);
      if (!canAdd) {
        throw new BadRequestException(
          'Jako nowy użytkownik nie możesz dodawać gości. ' +
            'Weź udział w wydarzeniu tego organizatora, aby odblokować tę opcję.',
        );
      }
    }

    const isOrganizer = addedByUserId === event.organizerId;
    if (!isOrganizer) {
      const guestCount = await this.eligibility.getGuestCount(eventId, addedByUserId);
      if (guestCount >= MAX_GUESTS_PER_USER) {
        throw new BadRequestException(`Możesz dodać maksymalnie ${MAX_GUESTS_PER_USER} gości`);
      }
    }

    const guestUser = await this.prisma.user.create({
      data: {
        email: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@guest.zgadajsie.pl`,
        displayName,
        isActive: false,
      },
    });

    // In open enrollment with free slots and organizer adding → auto CONFIRMED
    if (phase === 'OPEN_ENROLLMENT' && isOrganizer) {
      const slotsUsed = await this.countOccupiedSlots(eventId);
      if (slotsUsed < event.maxParticipants) {
        return this.prisma.eventParticipation.create({
          data: {
            eventId,
            userId: guestUser.id,
            addedByUserId,
            isGuest: true,
            status: 'CONFIRMED',
            approvedAt: new Date(),
          },
          include: { user: { select: USER_SELECT } },
        });
      }
    }

    return this.prisma.eventParticipation.create({
      data: {
        eventId,
        userId: guestUser.id,
        addedByUserId,
        isGuest: true,
        status: 'PENDING',
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async approve(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }
    if (participation.status !== 'PENDING') {
      throw new BadRequestException('Tylko zgłoszenia ze statusem PENDING mogą być zatwierdzone');
    }

    const slotsUsed = await this.countOccupiedSlots(participation.eventId);
    if (slotsUsed >= participation.event.maxParticipants) {
      throw new BadRequestException('Brak wolnych miejsc');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'APPROVED', approvedAt: new Date() },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
      },
    });

    const recipientId = updated.isGuest ? updated.addedByUserId : updated.userId;
    if (recipientId) {
      await this.notifyStatusChange(recipientId, updated.event.title, 'APPROVED', updated.eventId);
    }

    return updated;
  }

  async confirm(participationId: string, currentUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    if (participation.status !== 'APPROVED') {
      throw new BadRequestException('Tylko zgłoszenia ze statusem APPROVED mogą być potwierdzone');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'CONFIRMED' },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
      },
    });

    const recipientId = updated.isGuest ? updated.addedByUserId : updated.userId;
    if (recipientId) {
      await this.notifyStatusChange(recipientId, updated.event.title, 'CONFIRMED', updated.eventId);
    }

    return updated;
  }

  async reject(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'REJECTED' },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
      },
    });

    const recipientId = updated.isGuest ? updated.addedByUserId : updated.userId;
    if (recipientId) {
      await this.notifyStatusChange(recipientId, updated.event.title, 'REJECTED', updated.eventId);
    }

    this.promoteNextPending(updated.eventId, participation.event);

    return updated;
  }

  async leave(participationId: string, currentUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    if (participation.status === 'WITHDRAWN' || participation.status === 'REJECTED') {
      throw new BadRequestException('To zgłoszenie jest już nieaktywne');
    }

    await this.paymentsService.cleanupIntents(participation.id, participation.event.organizerId);

    const result = await this.prisma.eventParticipation.update({
      where: { id: participation.id },
      data: { status: 'WITHDRAWN', organizerPicked: false },
    });

    const hadSlot = ['APPROVED', 'CONFIRMED'].includes(participation.status);
    if (hadSlot) {
      this.promoteNextPending(participation.eventId, participation.event);
    }

    return result;
  }

  async getActiveGuestsForHost(eventId: string, hostUserId: string) {
    return this.prisma.eventParticipation.findMany({
      where: {
        eventId,
        addedByUserId: hostUserId,
        isGuest: true,
        status: { notIn: ['WITHDRAWN', 'REJECTED'] },
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async setOrganizerPick(participationId: string, organizerUserId: string, picked: boolean) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }
    if (participation.status !== 'PENDING') {
      throw new BadRequestException('Pre-pick dostępny tylko dla zgłoszeń PENDING');
    }

    if (picked) {
      const pickedCount = await this.prisma.eventParticipation.count({
        where: { eventId: participation.eventId, organizerPicked: true },
      });
      if (pickedCount >= participation.event.maxParticipants) {
        throw new BadRequestException('Wszystkie miejsca zostały już przydzielone');
      }
    }

    return this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { organizerPicked: picked },
      include: { user: { select: USER_SELECT } },
    });
  }

  async initiateEventPayment(
    participationId: string,
    currentUserId: string,
  ): Promise<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    if (participation.status !== 'APPROVED') {
      throw new BadRequestException('Płatność dostępna tylko dla zatwierdzonych zgłoszeń');
    }

    const event = participation.event;
    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Wydarzenie zostało odwołane - płatność nie jest możliwa');
    }
    if (event.costPerPerson.toNumber() <= 0) {
      throw new BadRequestException('To wydarzenie jest bezpłatne');
    }

    const payingUserId = participation.isGuest
      ? participation.addedByUserId ?? participation.userId
      : participation.userId;
    const user = await this.prisma.user.findUnique({
      where: { id: payingUserId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const backendUrl = this.configService.getOrThrow<string>('BACKEND_URL');

    return this.paymentsService.initiatePayment(
      participation.id,
      event.id,
      user.id,
      event.costPerPerson.toNumber(),
      user.email,
      user.displayName,
      frontendUrl,
      backendUrl,
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async countOccupiedSlots(eventId: string): Promise<number> {
    return this.prisma.eventParticipation.count({
      where: { eventId, status: { in: ['APPROVED', 'CONFIRMED'] } },
    });
  }

  private async createPending(
    eventId: string,
    userId: string,
    event: { organizerId: string; costPerPerson: { toNumber(): number }; title: string },
    isPaid: boolean,
  ) {
    const participation = await this.prisma.eventParticipation.create({
      data: { eventId, userId, status: 'PENDING' },
      include: { user: { select: USER_SELECT } },
    });

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

    return { ...participation, isPaid, costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0 };
  }

  private async handleOpenEnrollmentJoin(
    eventId: string,
    userId: string,
    event: {
      id: string;
      organizerId: string;
      costPerPerson: { toNumber(): number };
      maxParticipants: number;
      title: string;
      startsAt: Date;
      endsAt: Date;
      lotteryExecutedAt: Date | null;
      status: string;
    },
    isPaid: boolean,
  ) {
    const eligible = await this.eligibility.isEligibleForOpenEnrollment(userId, event.organizerId);

    if (!eligible) {
      return this.createPending(eventId, userId, event, isPaid);
    }

    const slotsUsed = await this.countOccupiedSlots(eventId);
    if (slotsUsed >= event.maxParticipants) {
      return this.createPending(eventId, userId, event, isPaid);
    }

    if (isPaid) {
      const participation = await this.prisma.eventParticipation.create({
        data: { eventId, userId, status: 'APPROVED', approvedAt: new Date() },
        include: { user: { select: USER_SELECT } },
      });
      return { ...participation, isPaid, costPerPerson: event.costPerPerson.toNumber() };
    }

    const participation = await this.prisma.eventParticipation.create({
      data: { eventId, userId, status: 'CONFIRMED', approvedAt: new Date() },
      include: { user: { select: USER_SELECT } },
    });
    return { ...participation, isPaid, costPerPerson: 0 };
  }

  private async handleRejoin(
    participationId: string,
    event: {
      id: string;
      organizerId: string;
      costPerPerson: { toNumber(): number };
      maxParticipants: number;
      title: string;
      startsAt: Date;
      endsAt: Date;
      lotteryExecutedAt: Date | null;
      status: string;
    },
    userId: string,
    isPaid: boolean,
    phase: ReturnType<typeof getEnrollmentPhase>,
  ) {
    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'PENDING', organizerPicked: false, approvedAt: null },
      include: { user: { select: USER_SELECT } },
    });

    if (phase !== 'OPEN_ENROLLMENT') {
      return { ...updated, isPaid, costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0 };
    }

    const eligible = await this.eligibility.isEligibleForOpenEnrollment(userId, event.organizerId);
    if (!eligible) {
      return { ...updated, isPaid, costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0 };
    }

    const slotsUsed = await this.countOccupiedSlots(event.id);
    if (slotsUsed >= event.maxParticipants) {
      return { ...updated, isPaid, costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0 };
    }

    if (isPaid) {
      const approved = await this.prisma.eventParticipation.update({
        where: { id: participationId },
        data: { status: 'APPROVED', approvedAt: new Date() },
        include: { user: { select: USER_SELECT } },
      });
      return { ...approved, isPaid, costPerPerson: event.costPerPerson.toNumber() };
    }

    const confirmed = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'CONFIRMED', approvedAt: new Date() },
      include: { user: { select: USER_SELECT } },
    });
    return { ...confirmed, isPaid, costPerPerson: 0 };
  }

  private assertCanActOnParticipation(
    participation: { userId: string; addedByUserId: string | null; event: { organizerId: string } },
    currentUserId: string,
  ): void {
    const isOwner = currentUserId === participation.userId;
    const isHost = currentUserId === participation.addedByUserId;
    const isOrganizer = currentUserId === participation.event.organizerId;
    if (!isOwner && !isHost && !isOrganizer) {
      throw new ForbiddenException('Brak uprawnień do tej operacji');
    }
  }

  private promoteNextPending(
    eventId: string,
    event: { costPerPerson: { toNumber(): number }; maxParticipants: number; title: string },
  ): void {
    setImmediate(async () => {
      try {
        const slotsUsed = await this.countOccupiedSlots(eventId);
        if (slotsUsed >= event.maxParticipants) return;

        const isPaid = event.costPerPerson.toNumber() > 0;
        const nextStatus = isPaid ? 'APPROVED' : 'CONFIRMED';

        const nextPending = await this.prisma.eventParticipation.findFirst({
          where: { eventId, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: USER_SELECT } },
        });

        if (nextPending) {
          await this.prisma.eventParticipation.update({
            where: { id: nextPending.id },
            data: { status: nextStatus, approvedAt: new Date() },
          });

          const recipientId = nextPending.isGuest ? nextPending.addedByUserId : nextPending.userId;
          if (recipientId) {
            await this.notifyStatusChange(recipientId, event.title, nextStatus, eventId);
          }
          this.logger.log(
            `Auto-promoted participation ${nextPending.id} to ${nextStatus} for event ${eventId}`,
          );
        }

        // Notify remaining PENDING users about the freed spot
        const remainingPending = await this.prisma.eventParticipation.findMany({
          where: { eventId, status: 'PENDING', id: { not: nextPending?.id ?? '' } },
          include: { user: { select: USER_SELECT } },
        });
        for (const p of remainingPending) {
          const rid = p.isGuest ? p.addedByUserId : p.userId;
          if (rid) {
            try {
              await this.pushService.notifyParticipationStatus(
                rid,
                event.title,
                'SPOT_AVAILABLE',
                eventId,
              );
            } catch {
              // best-effort notification
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to auto-promote pending for event ${eventId}: ${err}`);
      }
    });
  }

  private async notifyStatusChange(
    recipientId: string,
    eventTitle: string,
    status: string,
    eventId: string,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, displayName: true },
      });
      if (!user) {
        return;
      }
      await this.pushService.notifyParticipationStatus(recipientId, eventTitle, status, eventId);
      await this.emailService.sendParticipationStatusEmail(
        user.email,
        user.displayName,
        eventTitle,
        status,
      );
    } catch (err) {
      this.logger.error(`Failed to notify status change: ${err}`);
    }
  }
}
