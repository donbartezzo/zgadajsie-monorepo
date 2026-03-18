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
import { SlotService } from '../slots/slot.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { isEventJoinable } from '../events/event-time-status.util';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';

const USER_SELECT = { id: true, displayName: true, avatarUrl: true, email: true };
const MAX_GUESTS_PER_USER = 3;

type ParticipationWithSlot = {
  wantsIn: boolean;
  withdrawnBy?: string | null;
  slot?: { confirmed: boolean } | null;
};

function deriveStatus(p: ParticipationWithSlot): string {
  if (!p.wantsIn) {
    return p.withdrawnBy === 'ORGANIZER' ? 'REJECTED' : 'WITHDRAWN';
  }
  if (p.slot) {
    return p.slot.confirmed ? 'CONFIRMED' : 'APPROVED';
  }
  return 'PENDING';
}

function withDerivedStatus<T extends ParticipationWithSlot>(p: T): T & { status: string } {
  return { ...p, status: deriveStatus(p) };
}

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger(ParticipationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    private pushService: PushService,
    private paymentsService: PaymentsService,
    private slotService: SlotService,
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
      include: { slot: true },
    });

    // Rejoin after withdrawal
    if (existing && !existing.wantsIn) {
      return this.handleRejoin(existing.id, event, userId, isPaid, phase);
    }
    if (existing) {
      throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');
    }

    // Organizer auto-confirmed with slot
    if (event.organizerId === userId) {
      return this.prisma.$transaction(async (tx) => {
        const participation = await tx.eventParticipation.create({
          data: { eventId, userId, wantsIn: true },
          include: { user: { select: USER_SELECT } },
        });
        await this.slotService.assignSlot(eventId, participation.id, true, tx);
        const withSlot = await tx.eventParticipation.findUnique({
          where: { id: participation.id },
          include: { user: { select: USER_SELECT }, slot: true },
        });
        return {
          ...withDerivedStatus(withSlot!),
          isPaid,
          costPerPerson: event.costPerPerson.toNumber(),
        };
      });
    }

    // PRE_ENROLLMENT: always waiting (no slot)
    if (phase === 'PRE_ENROLLMENT') {
      return this.createWaiting(eventId, userId, event, isPaid, 'PRE_ENROLLMENT');
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

    // In open enrollment with free slots → assign slot (confirmed=false, user must confirm)
    if (phase === 'OPEN_ENROLLMENT') {
      const freeSlots = await this.slotService.getFreeSlotCount(eventId);
      if (freeSlots > 0) {
        return this.prisma.$transaction(async (tx) => {
          const participation = await tx.eventParticipation.create({
            data: {
              eventId,
              userId: guestUser.id,
              addedByUserId,
              isGuest: true,
              wantsIn: true,
            },
            include: { user: { select: USER_SELECT } },
          });
          // confirmed=false because user (host) must confirm
          await this.slotService.assignSlot(eventId, participation.id, false, tx);
          const withSlot = await tx.eventParticipation.findUnique({
            where: { id: participation.id },
            include: { user: { select: USER_SELECT }, slot: true },
          });
          return withDerivedStatus(withSlot!);
        });
      }
    }

    // No free slots or pre-enrollment → waiting list
    const participation = await this.prisma.eventParticipation.create({
      data: {
        eventId,
        userId: guestUser.id,
        addedByUserId,
        isGuest: true,
        wantsIn: true,
      },
      include: { user: { select: USER_SELECT }, slot: true },
    });
    return withDerivedStatus(participation);
  }

  /**
   * Organizer assigns a slot to a waiting participant.
   * In PRE_ENROLLMENT: no notification (user learns after lottery).
   * In OPEN_ENROLLMENT: notification sent.
   */
  async assignSlotToParticipant(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }
    if (!participation.wantsIn) {
      throw new BadRequestException('Uczestnik wypisał się z wydarzenia');
    }
    if (participation.slot) {
      throw new BadRequestException('Uczestnik już ma przydzielone miejsce');
    }

    const freeSlots = await this.slotService.getFreeSlotCount(participation.eventId);
    if (freeSlots === 0) {
      throw new BadRequestException('Brak wolnych miejsc');
    }

    const phase = getEnrollmentPhase(participation.event);

    // Assign slot (confirmed=false, user must confirm)
    await this.slotService.assignSlot(participation.eventId, participationId, false);

    const updated = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // Notify only in OPEN_ENROLLMENT (not during pre-enrollment)
    if (phase === 'OPEN_ENROLLMENT' && updated) {
      const recipientId = updated.isGuest ? updated.addedByUserId : updated.userId;
      if (recipientId) {
        await this.notifySlotAssigned(recipientId, updated.event.title, updated.eventId);
      }
    }

    return updated;
  }

  /**
   * User confirms their slot (acknowledges they want to participate).
   */
  async confirmSlot(participationId: string, currentUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    if (!participation.wantsIn) {
      throw new BadRequestException('Uczestnik wypisał się z wydarzenia');
    }
    if (!participation.slot) {
      throw new BadRequestException('Nie masz przydzielonego miejsca');
    }
    if (participation.slot.confirmed) {
      throw new BadRequestException('Miejsce jest już potwierdzone');
    }

    await this.slotService.confirmSlot(participationId);

    return this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });
  }

  /**
   * Organizer releases a participant's slot (removes them from event).
   */
  async releaseSlotFromParticipant(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    const hadSlot = !!participation.slot;

    // Transaction: set wantsIn=false + release slot
    await this.prisma.$transaction(async (tx) => {
      await tx.eventParticipation.update({
        where: { id: participationId },
        data: { wantsIn: false, withdrawnBy: 'ORGANIZER' },
      });
      if (hadSlot) {
        await this.slotService.releaseSlot(participationId, tx);
      }
    });

    // Cleanup payment intents
    await this.paymentsService.cleanupIntents(participationId, participation.event.organizerId);

    const updated = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // Notify removed user
    if (updated) {
      const recipientId = updated.isGuest ? updated.addedByUserId : updated.userId;
      if (recipientId) {
        await this.notifyRemoved(recipientId, updated.event.title, updated.eventId);
      }
    }

    // Notify waiting participants about freed slot
    if (hadSlot) {
      this.notifyWaitingAboutFreeSlot(participation.eventId, participation.event.title);
    }

    return updated;
  }

  /**
   * User leaves the event voluntarily.
   */
  async leave(participationId: string, currentUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    if (!participation.wantsIn) {
      throw new BadRequestException('Już wypisałeś się z tego wydarzenia');
    }

    const hadSlot = !!participation.slot;

    // Transaction: set wantsIn=false + release slot
    await this.prisma.$transaction(async (tx) => {
      await tx.eventParticipation.update({
        where: { id: participationId },
        data: { wantsIn: false, withdrawnBy: 'USER' },
      });
      if (hadSlot) {
        await this.slotService.releaseSlot(participationId, tx);
      }
    });

    // Cleanup payment intents
    await this.paymentsService.cleanupIntents(participationId, participation.event.organizerId);

    // Notify waiting participants about freed slot
    if (hadSlot) {
      this.notifyWaitingAboutFreeSlot(participation.eventId, participation.event.title);
    }

    return this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { slot: true },
    });
  }

  async getActiveGuestsForHost(eventId: string, hostUserId: string) {
    return this.prisma.eventParticipation.findMany({
      where: {
        eventId,
        addedByUserId: hostUserId,
        isGuest: true,
        wantsIn: true,
      },
      include: { user: { select: USER_SELECT }, slot: true },
    });
  }

  async initiateEventPayment(
    participationId: string,
    currentUserId: string,
  ): Promise<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    this.assertCanActOnParticipation(participation, currentUserId);

    // Must have a slot to pay
    if (!participation.slot) {
      throw new BadRequestException(
        'Płatność dostępna tylko dla uczestników z przydzielonym miejscem',
      );
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

  /**
   * Create a waiting participation (no slot assigned).
   * @param waitingReason - Why user didn't get automatic slot: NEW_USER, BANNED, NO_SLOTS, PRE_ENROLLMENT
   */
  private async createWaiting(
    eventId: string,
    userId: string,
    event: { organizerId: string; costPerPerson: { toNumber(): number }; title: string },
    isPaid: boolean,
    waitingReason?: 'NEW_USER' | 'BANNED' | 'NO_SLOTS' | 'PRE_ENROLLMENT',
  ) {
    const participation = await this.prisma.eventParticipation.create({
      data: { eventId, userId, wantsIn: true },
      include: { user: { select: USER_SELECT }, slot: true },
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

    return {
      ...withDerivedStatus(participation),
      isPaid,
      costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
      waitingReason: waitingReason ?? null,
    };
  }

  /**
   * Handle open enrollment join — assign slot if eligible and available.
   */
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
    const [isBanned, isNew] = await Promise.all([
      this.eligibility.isBannedByOrganizer(userId, event.organizerId),
      this.eligibility.isNewUser(userId, event.organizerId),
    ]);

    // Banned users go to waiting list (organizer will reject)
    if (isBanned) {
      return this.createWaiting(eventId, userId, event, isPaid, 'BANNED');
    }

    // New users need organizer approval
    if (isNew) {
      return this.createWaiting(eventId, userId, event, isPaid, 'NEW_USER');
    }

    const freeSlots = await this.slotService.getFreeSlotCount(eventId);
    if (freeSlots === 0) {
      return this.createWaiting(eventId, userId, event, isPaid, 'NO_SLOTS');
    }

    // Eligible + free slot → assign slot (confirmed=true for free events, false for paid)
    return this.prisma.$transaction(async (tx) => {
      const participation = await tx.eventParticipation.create({
        data: { eventId, userId, wantsIn: true },
        include: { user: { select: USER_SELECT } },
      });

      // For free events, auto-confirm. For paid, user must pay first.
      const confirmed = !isPaid;
      await this.slotService.assignSlot(eventId, participation.id, confirmed, tx);

      const withSlot = await tx.eventParticipation.findUnique({
        where: { id: participation.id },
        include: { user: { select: USER_SELECT }, slot: true },
      });

      return {
        ...withDerivedStatus(withSlot!),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
      };
    });
  }

  /**
   * Handle rejoin after withdrawal.
   */
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
    // Reset to wanting-in state
    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { wantsIn: true, withdrawnBy: null },
      include: { user: { select: USER_SELECT }, slot: true },
    });

    // Organizer always gets auto-confirmed slot on rejoin
    if (event.organizerId === userId) {
      await this.slotService.assignSlot(event.id, participationId, true);
      const withSlot = await this.prisma.eventParticipation.findUnique({
        where: { id: participationId },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      return {
        ...withDerivedStatus(withSlot!),
        isPaid,
        costPerPerson: event.costPerPerson.toNumber(),
      };
    }

    // In pre-enrollment, stay as waiting
    if (phase !== 'OPEN_ENROLLMENT') {
      return {
        ...withDerivedStatus(updated),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'PRE_ENROLLMENT' as const,
      };
    }

    // Rejoin skips eligibility check — user was already accepted before
    const freeSlots = await this.slotService.getFreeSlotCount(event.id);
    if (freeSlots === 0) {
      return {
        ...withDerivedStatus(updated),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'NO_SLOTS' as const,
      };
    }

    // Assign slot
    const confirmed = !isPaid;
    await this.slotService.assignSlot(event.id, participationId, confirmed);

    const withSlot = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { user: { select: USER_SELECT }, slot: true },
    });

    return {
      ...withDerivedStatus(withSlot!),
      isPaid,
      costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
    };
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

  /**
   * Notify user that they got a slot assigned.
   */
  private async notifySlotAssigned(
    recipientId: string,
    eventTitle: string,
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
      await this.pushService.notifyParticipationStatus(
        recipientId,
        eventTitle,
        'SLOT_ASSIGNED',
        eventId,
      );
      await this.emailService.sendParticipationStatusEmail(
        user.email,
        user.displayName,
        eventTitle,
        'SLOT_ASSIGNED',
      );
    } catch (err) {
      this.logger.error(`Failed to notify slot assigned: ${err}`);
    }
  }

  /**
   * Notify user that they were removed from event.
   */
  private async notifyRemoved(
    recipientId: string,
    eventTitle: string,
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
      await this.pushService.notifyParticipationStatus(recipientId, eventTitle, 'REMOVED', eventId);
      await this.emailService.sendParticipationStatusEmail(
        user.email,
        user.displayName,
        eventTitle,
        'REMOVED',
      );
    } catch (err) {
      this.logger.error(`Failed to notify removed: ${err}`);
    }
  }

  /**
   * Notify all waiting participants that a slot became available.
   * Fire-and-forget, best effort.
   */
  private notifyWaitingAboutFreeSlot(eventId: string, eventTitle: string): void {
    setImmediate(async () => {
      try {
        const waiting = await this.prisma.eventParticipation.findMany({
          where: {
            eventId,
            wantsIn: true,
            slot: null,
          },
          include: { user: { select: USER_SELECT } },
        });

        for (const p of waiting) {
          const recipientId = p.isGuest ? p.addedByUserId : p.userId;
          if (recipientId) {
            try {
              await this.pushService.notifyParticipationStatus(
                recipientId,
                eventTitle,
                'SPOT_AVAILABLE',
                eventId,
              );
            } catch {
              // best-effort notification
            }
          }
        }

        this.logger.log(`Notified ${waiting.length} waiting participants about free slot`);
      } catch (err) {
        this.logger.error(`Failed to notify waiting about free slot: ${err}`);
      }
    });
  }
}
