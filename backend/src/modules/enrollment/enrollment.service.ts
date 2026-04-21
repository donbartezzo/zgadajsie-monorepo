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
import { isEventEnded, isEventJoinable } from '../events/event-time-status.util';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { EventRoleConfig, AvailableRole } from '../slots/slot.types';
import {
  EventRealtimeScope,
  MAX_GUESTS_PER_USER,
  EVENT_ENDED_MESSAGE,
  EVENT_NOT_FOUND_MESSAGE,
  PARTICIPATION_NOT_FOUND_MESSAGE,
  USER_NOT_ORGANIZER_MESSAGE,
  NOT_ORGANIZER_MESSAGE,
  EVENT_CANCELLED_MESSAGE,
  PARTICIPANT_WITHDREW_MESSAGE,
  PARTICIPANT_ALREADY_HAS_SLOT_MESSAGE,
} from '@zgadajsie/shared';
import { featureFlags } from '../../common/config/feature-flags';
import { resolveUserContext } from '../auth/utils/auth-user.util';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

const USER_SELECT = { id: true, displayName: true, avatarUrl: true, email: true };

type EnrollmentWithSlot = {
  wantsIn: boolean;
  withdrawnBy?: string | null;
  slot?: { confirmed: boolean } | null;
};

type JoinEventLike = {
  startsAt: Date;
  endsAt: Date;
  lotteryExecutedAt: Date | null;
  status: string;
};

function deriveStatus(p: EnrollmentWithSlot): string {
  if (!p.wantsIn) {
    return p.withdrawnBy === 'ORGANIZER' ? 'REJECTED' : 'WITHDRAWN';
  }
  if (p.slot) {
    return p.slot.confirmed ? 'CONFIRMED' : 'APPROVED';
  }
  return 'PENDING';
}

function withDerivedStatus<T extends EnrollmentWithSlot>(p: T): T & { status: string } {
  return { ...p, status: deriveStatus(p) };
}

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    private pushService: PushService,
    private paymentsService: PaymentsService,
    private slotService: SlotService,
    private eligibility: EnrollmentEligibilityService,
    private eventRealtime: EventRealtimeService,
  ) {}

  async join(eventId: string, user: AuthUser, roleKey?: string) {
    const { userId, isAdmin } = resolveUserContext(user);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(EVENT_NOT_FOUND_MESSAGE);
    }

    this.assertEventMutable(event, isAdmin);

    const phase = this.getJoinPhase(event, isAdmin);

    const isPaid = event.costPerPerson.toNumber() > 0;
    const roleConfig = event.roleConfig as unknown as EventRoleConfig | null;

    // Validate roleKey if event has roles
    const validatedRoleKey = this.validateRoleKey(roleConfig, roleKey);

    const existing = await this.prisma.eventEnrollment.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { slot: true },
    });

    // Rejoin after withdrawal
    if (existing && !existing.wantsIn) {
      return this.handleRejoin(existing.id, event, userId, isPaid, phase, validatedRoleKey);
    }
    if (existing) {
      throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');
    }

    // Organizer auto-confirmed with slot
    if (event.organizerId === userId) {
      const result = await this.prisma.$transaction(async (tx) => {
        const participation = await tx.eventEnrollment.create({
          data: { eventId, userId, wantsIn: true, roleKey: validatedRoleKey },
          include: { user: { select: USER_SELECT } },
        });
        await this.slotService.assignSlot(eventId, participation.id, true, tx, validatedRoleKey);
        const withSlot = await tx.eventEnrollment.findUnique({
          where: { id: participation.id },
          include: { user: { select: USER_SELECT }, slot: true },
        });
        if (!withSlot) {
          throw new Error('Nie udało się odczytać zgłoszenia po utworzeniu uczestnictwa');
        }
        return {
          ...withDerivedStatus(withSlot),
          isPaid,
          costPerPerson: event.costPerPerson.toNumber(),
        };
      });

      this.notifyEventChanged(eventId, 'all');
      return result;
    }

    // PRE_ENROLLMENT: always waiting (no slot)
    if (phase === 'PRE_ENROLLMENT') {
      return this.createWaiting(eventId, userId, event, isPaid, 'PRE_ENROLLMENT', validatedRoleKey);
    }

    // OPEN_ENROLLMENT: depends on eligibility + slot availability
    return this.handleOpenEnrollmentJoin(eventId, userId, event, isPaid, validatedRoleKey);
  }

  /**
   * Validate roleKey against event's roleConfig.
   * Returns the roleKey to use (default role key if not specified).
   */
  private validateRoleKey(
    roleConfig: EventRoleConfig | null,
    roleKey?: string,
  ): string | undefined {
    if (!roleConfig) {
      // Event has no roles
      if (roleKey) {
        throw new BadRequestException('To wydarzenie nie wymaga wyboru roli');
      }
      return undefined;
    }

    // Event has roles — roleKey is required
    if (!roleKey) {
      // Use default role
      const defaultRole = roleConfig.roles.find((r) => r.isDefault);
      if (!defaultRole) {
        throw new BadRequestException('Wydarzenie wymaga wyboru roli');
      }
      return defaultRole.key;
    }

    // Validate roleKey exists in config
    const role = roleConfig.roles.find((r) => r.key === roleKey);
    if (!role) {
      throw new BadRequestException(`Nieznana rola: ${roleKey}`);
    }

    return roleKey;
  }

  async joinGuest(eventId: string, addedByUser: AuthUser, displayName: string, roleKey?: string) {
    const { userId: addedByUserId, isAdmin } = resolveUserContext(addedByUser);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(EVENT_NOT_FOUND_MESSAGE);
    }

    this.assertEventMutable(event, isAdmin);

    const phase = this.getJoinPhase(event, isAdmin);

    // Validate roleKey if provided
    if (roleKey) {
      const roleConfig = event.roleConfig as unknown as EventRoleConfig | null;
      const validatedRoleKey = this.validateRoleKey(roleConfig, roleKey);
      // Use validated role (throws if invalid)
      roleKey = validatedRoleKey;
    }

    // Everyone can add guests now
    // If the adder is a new user, the guest will automatically be put into pending status later

    const isOrganizer = addedByUserId === event.organizerId;
    if (!isOrganizer) {
      const guestCount = await this.eligibility.getGuestCount(eventId, addedByUserId);
      if (guestCount >= MAX_GUESTS_PER_USER) {
        throw new BadRequestException(`Możesz dodać maksymalnie ${MAX_GUESTS_PER_USER} gości`);
      }
    }

    // Check host eligibility once (fixes double-check race and missing ban check)
    const [isHostBanned, isHostNew] = isOrganizer
      ? [false, false]
      : await Promise.all([
          this.eligibility.isBannedByOrganizer(addedByUserId, event.organizerId),
          this.eligibility.isNewUser(addedByUserId, event.organizerId),
        ]);

    const guestUser = await this.prisma.user.create({
      data: {
        email: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@guest.zgadajsie.pl`,
        displayName,
        isActive: false,
      },
    });

    // In open enrollment with free slots → assign slot (confirmed=false, user must confirm)
    if (phase === 'OPEN_ENROLLMENT' && !isHostBanned && !isHostNew) {
      const roleConfig = event.roleConfig as unknown as EventRoleConfig | null;
      const validatedRoleKey = this.validateRoleKey(roleConfig, roleKey);
      const freeSlots = await this.slotService.getFreeSlotCount(eventId, validatedRoleKey);
      if (freeSlots > 0) {
        const result = await this.prisma.$transaction(async (tx) => {
          const participation = await tx.eventEnrollment.create({
            data: {
              eventId,
              userId: guestUser.id,
              addedByUserId,
              wantsIn: true,
              roleKey: validatedRoleKey,
            },
            include: { user: { select: USER_SELECT } },
          });
          // confirmed=false because user (host) must confirm
          await this.slotService.assignSlot(eventId, participation.id, false, tx, validatedRoleKey);
          const withSlot = await tx.eventEnrollment.findUnique({
            where: { id: participation.id },
            include: { user: { select: USER_SELECT }, slot: true },
          });
          if (!withSlot) {
            throw new Error('Nie udało się odczytać zgłoszenia po przydzieleniu miejsca');
          }
          return withDerivedStatus(withSlot);
        });
        this.notifyEventChanged(eventId, 'participants');
        return result;
      }
    }

    // No free slots, pre-enrollment, banned host, or new host → waiting list
    const waitingReason = isHostBanned
      ? 'BANNED'
      : isHostNew
        ? 'NEW_USER'
        : phase === 'PRE_ENROLLMENT'
          ? 'PRE_ENROLLMENT'
          : 'NO_SLOTS';

    const participation = await this.prisma.eventEnrollment.create({
      data: {
        eventId,
        userId: guestUser.id,
        addedByUserId,
        wantsIn: true,
        roleKey,
        waitingReason,
      },
      include: { user: { select: USER_SELECT }, slot: true },
    });
    this.notifyEventChanged(eventId, 'participants');
    return withDerivedStatus(participation);
  }

  async updateGuestName(participationId: string, addedByUser: AuthUser, displayName: string) {
    const { userId: addedByUserId, isAdmin } = resolveUserContext(addedByUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: {
        user: true,
        event: true,
      },
    });

    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    this.assertEventMutable(participation.event, isAdmin);

    if (!isAdmin && participation.addedByUserId === null) {
      throw new BadRequestException('Można edytować tylko dane gości');
    }

    if (!isAdmin && participation.addedByUserId !== addedByUserId) {
      throw new ForbiddenException('Możesz edytować tylko swoich gości');
    }

    // Update the guest user's displayName
    const updatedUser = await this.prisma.user.update({
      where: { id: participation.userId },
      data: { displayName },
    });

    return {
      id: participation.id,
      displayName: updatedUser.displayName,
    };
  }
  async assignSlotToParticipant(participationId: string, organizerUser: AuthUser) {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }
    if (!isAdmin && participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException(USER_NOT_ORGANIZER_MESSAGE);
    }
    this.assertEventMutable(participation.event, isAdmin);
    if (!participation.wantsIn) {
      throw new BadRequestException(PARTICIPANT_WITHDREW_MESSAGE);
    }
    if (participation.slot) {
      throw new BadRequestException(PARTICIPANT_ALREADY_HAS_SLOT_MESSAGE);
    }

    const roleKey = participation.roleKey;
    const freeSlots = await this.slotService.getFreeSlotCount(participation.eventId, roleKey);
    if (freeSlots === 0) {
      if (roleKey && participation.event.roleConfig) {
        const roleConfig = participation.event.roleConfig as unknown as EventRoleConfig;
        const availableRoles = await this.slotService.getAvailableRoles(
          participation.eventId,
          roleConfig,
        );
        if (availableRoles.length > 0) {
          const suggestion = availableRoles.map((r) => `${r.title} (${r.freeSlots})`).join(', ');
          throw new BadRequestException(
            `Brak wolnych miejsc dla tej roli. Dostępne miejsca w: ${suggestion}`,
          );
        }
      }
      throw new BadRequestException('Brak wolnych (odblokowanych) miejsc dla tej roli');
    }

    const phase = getEnrollmentPhase(participation.event);

    // Assign slot matching participant's registered role (confirmed=false, user must confirm)
    await this.slotService.assignSlot(
      participation.eventId,
      participationId,
      false,
      undefined,
      roleKey,
    );

    const updated = await this.prisma.eventEnrollment.update({
      where: { id: participationId },
      data: { waitingReason: null },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // Auto-trust: mark real user as trusted upon first organizer-approved slot assignment.
    // Guests (addedByUserId != null) are virtual accounts — trust does not apply to them.
    // Non-critical: failure must not roll back the slot assignment already committed above.
    if (!participation.addedByUserId) {
      const organizerId = participation.event.organizerId;
      this.prisma.organizerUserRelation
        .upsert({
          where: {
            organizerUserId_targetUserId: {
              organizerUserId: organizerId,
              targetUserId: participation.userId,
            },
          },
          create: {
            organizerUserId: organizerId,
            targetUserId: participation.userId,
            isTrusted: true,
            trustedAt: new Date(),
          },
          update: {
            isTrusted: true,
            trustedAt: new Date(),
          },
        })
        .catch((err: unknown) => {
          this.logger.error(
            `Auto-trust upsert failed for user ${participation.userId} / organizer ${organizerId}: ${(err as Error).message}`,
          );
        });
    }

    this.notifyEventChanged(participation.eventId, 'all');

    // Notify only in OPEN_ENROLLMENT (not during pre-enrollment)
    if (phase === 'OPEN_ENROLLMENT' && updated) {
      const recipientId = updated.addedByUserId ?? updated.userId;
      await this.notifySlotAssigned(recipientId, updated.event.title, updated.eventId);
    }

    return updated;
  }

  /**
   * User confirms their slot (acknowledges they want to participate).
   */
  async confirmSlot(participationId: string, currentUser: AuthUser) {
    const { userId: currentUserId, isAdmin } = resolveUserContext(currentUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    this.assertCanActOnParticipation(participation, currentUserId, isAdmin);
    this.assertEventMutable(participation.event, isAdmin);
    if (!participation.wantsIn) {
      throw new BadRequestException(PARTICIPANT_WITHDREW_MESSAGE);
    }
    if (!participation.slot) {
      throw new BadRequestException('Nie masz przydzielonego miejsca');
    }
    if (participation.slot.confirmed) {
      throw new BadRequestException('Miejsce jest już potwierdzone');
    }

    await this.slotService.confirmSlot(participationId);

    const updated = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    this.notifyEventChanged(participation.eventId, 'all');
    return updated;
  }

  /**
   * Organizer releases a participant's slot (removes them from event).
   */
  async releaseSlotFromParticipant(participationId: string, organizerUser: AuthUser) {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }
    if (!isAdmin && participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException(USER_NOT_ORGANIZER_MESSAGE);
    }
    this.assertEventMutable(participation.event, isAdmin);

    const hadSlot = !!participation.slot;
    const slotWasLocked = participation.slot?.locked ?? false;

    // Transaction: set wantsIn=false + release slot
    await this.prisma.$transaction(async (tx) => {
      await tx.eventEnrollment.update({
        where: { id: participationId },
        data: { wantsIn: false, withdrawnBy: 'ORGANIZER' },
      });
      if (hadSlot) {
        await this.slotService.releaseSlot(participationId, tx);
      }
    });

    // Cleanup payment intents
    await this.paymentsService.cleanupIntents(participationId, participation.event.organizerId);

    const updated = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // Notify removed user
    if (updated) {
      const recipientId = updated.addedByUserId ?? updated.userId;
      await this.notifyRemoved(recipientId, updated.event.title, updated.eventId);
    }

    // Notify waiting participants about freed slot (skip for locked slots)
    if (hadSlot && !slotWasLocked) {
      this.notifyWaitingAboutFreeSlot(participation.eventId, participation.event.title);
    }

    this.notifyEventChanged(participation.eventId, 'all');

    return updated;
  }

  /**
   * Organizer permanently deletes a participation record.
   * Blocked when Payment records exist (financial audit trail must be preserved).
   */
  async deleteParticipation(participationId: string, organizerUser: AuthUser) {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true, payments: true },
    });

    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }
    if (!isAdmin && participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException(NOT_ORGANIZER_MESSAGE);
    }
    this.assertEventMutable(participation.event, isAdmin);
    if (participation.payments.length > 0) {
      throw new BadRequestException(
        'Nie można usunąć zgłoszenia z historią płatności. Użyj opcji odrzucenia uczestnika.',
      );
    }

    const { eventId } = participation;
    const hadSlot = !!participation.slot;
    const slotWasLocked = participation.slot?.locked ?? false;
    const isGuest = !!participation.addedByUserId;
    const guestUserId = isGuest ? participation.userId : null;

    // Clean up payment intents (restores vouchers if any were reserved)
    await this.paymentsService.cleanupIntents(participationId, participation.event.organizerId);

    await this.prisma.$transaction(async (tx) => {
      if (hadSlot) {
        await this.slotService.releaseSlot(participationId, tx);
      }
      await tx.eventEnrollment.delete({ where: { id: participationId } });
      if (guestUserId) {
        await tx.user.delete({ where: { id: guestUserId } });
      }
    });

    if (hadSlot && !slotWasLocked) {
      this.notifyWaitingAboutFreeSlot(eventId, participation.event.title);
    }

    this.notifyEventChanged(eventId, 'all');
  }

  /**
   * User leaves the event voluntarily.
   */
  async leave(participationId: string, currentUser: AuthUser) {
    const { userId: currentUserId, isAdmin } = resolveUserContext(currentUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');
    }

    this.assertCanActOnParticipation(participation, currentUserId, isAdmin);
    this.assertEventMutable(participation.event, isAdmin);

    if (!participation.wantsIn) {
      throw new BadRequestException('Już wypisałeś się z tego wydarzenia');
    }

    const hadSlot = !!participation.slot;
    const slotWasLocked = participation.slot?.locked ?? false;

    // Transaction: set wantsIn=false + release slot
    await this.prisma.$transaction(async (tx) => {
      await tx.eventEnrollment.update({
        where: { id: participationId },
        data: { wantsIn: false, withdrawnBy: 'USER' },
      });
      if (hadSlot) {
        await this.slotService.releaseSlot(participationId, tx);
      }
    });

    // Cleanup payment intents
    await this.paymentsService.cleanupIntents(participationId, participation.event.organizerId);

    // Notify waiting participants about freed slot (skip for locked slots)
    if (hadSlot && !slotWasLocked) {
      this.notifyWaitingAboutFreeSlot(participation.eventId, participation.event.title);
    }

    this.notifyEventChanged(participation.eventId, 'all');

    return this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { slot: true },
    });
  }

  async getActiveGuestsForHost(eventId: string, hostUserId: string) {
    return this.prisma.eventEnrollment.findMany({
      where: {
        eventId,
        addedByUserId: hostUserId,
        wantsIn: true,
      },
      include: { user: { select: USER_SELECT }, slot: true },
    });
  }

  async initiateEventPayment(
    participationId: string,
    currentUser: AuthUser,
  ): Promise<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    const { userId: currentUserId, isAdmin } = resolveUserContext(currentUser);
    if (!featureFlags.enableOnlinePayments) {
      throw new ForbiddenException(
        'Płatności online są tymczasowo wyłączone. Skontaktuj się z organizatorem w sprawie płatności gotówką.',
      );
    }

    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    this.assertCanActOnParticipation(participation, currentUserId, isAdmin);
    this.assertEventMutable(participation.event, isAdmin);

    // Must have a slot to pay
    if (!participation.slot) {
      throw new BadRequestException(
        'Płatność dostępna tylko dla uczestników z przydzielonym miejscem',
      );
    }

    const event = participation.event;
    if (!isAdmin && event.status === 'CANCELLED') {
      throw new BadRequestException(EVENT_CANCELLED_MESSAGE + ' - płatność nie jest możliwa');
    }
    if (event.costPerPerson.toNumber() <= 0) {
      throw new BadRequestException('To wydarzenie jest bezpłatne');
    }

    const payingUserId = participation.addedByUserId ?? participation.userId;
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

  private assertJoinEligibility(event: JoinEventLike): ReturnType<typeof getEnrollmentPhase> {
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

    return phase;
  }

  private getJoinPhase(
    event: JoinEventLike,
    isAdmin: boolean,
  ): ReturnType<typeof getEnrollmentPhase> {
    if (isAdmin) {
      return getEnrollmentPhase(event) ?? 'OPEN_ENROLLMENT';
    }

    return this.assertJoinEligibility(event);
  }

  private assertEventMutable(
    event: { startsAt: Date; endsAt: Date; status: string },
    isAdmin: boolean,
  ): void {
    if (!isAdmin && isEventEnded(event)) {
      throw new BadRequestException(EVENT_ENDED_MESSAGE);
    }
  }

  /**
   * Create a waiting participation (no slot assigned).
   * @param waitingReason - Why user didn't get automatic slot: NEW_USER, BANNED, NO_SLOTS, NO_SLOTS_FOR_ROLE, PRE_ENROLLMENT
   */
  private async createWaiting(
    eventId: string,
    userId: string,
    event: {
      organizerId: string;
      costPerPerson: { toNumber(): number };
      title: string;
      roleConfig?: unknown;
    },
    isPaid: boolean,
    waitingReason?: 'NEW_USER' | 'BANNED' | 'NO_SLOTS' | 'NO_SLOTS_FOR_ROLE' | 'PRE_ENROLLMENT',
    roleKey?: string,
    availableRoles?: AvailableRole[],
  ) {
    const participation = await this.prisma.eventEnrollment.create({
      data: { eventId, userId, wantsIn: true, roleKey, waitingReason },
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

    const result = {
      ...withDerivedStatus(participation),
      isPaid,
      costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
      waitingReason: waitingReason ?? null,
      availableRoles: availableRoles ?? null,
    };

    this.notifyEventChanged(eventId, 'participants');
    return result;
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
      roleConfig?: unknown;
    },
    isPaid: boolean,
    roleKey?: string,
  ) {
    const [isBanned, isNew] = await Promise.all([
      this.eligibility.isBannedByOrganizer(userId, event.organizerId),
      this.eligibility.isNewUser(userId, event.organizerId),
    ]);

    const roleConfig = event.roleConfig as EventRoleConfig | null;

    // Banned users go to waiting list (organizer will reject)
    if (isBanned) {
      return this.createWaiting(eventId, userId, event, isPaid, 'BANNED', roleKey);
    }

    // New users need organizer approval
    if (isNew) {
      return this.createWaiting(eventId, userId, event, isPaid, 'NEW_USER', roleKey);
    }

    // Check slot availability (role-specific if roleKey provided)
    const freeSlots = await this.slotService.getFreeSlotCount(eventId, roleKey);
    if (freeSlots === 0) {
      // If role-specific and no slots for that role, suggest alternatives
      if (roleKey && roleConfig) {
        const availableRoles = await this.slotService.getAvailableRoles(eventId, roleConfig);
        if (availableRoles.length > 0) {
          return this.createWaiting(
            eventId,
            userId,
            event,
            isPaid,
            'NO_SLOTS_FOR_ROLE',
            roleKey,
            availableRoles,
          );
        }
      }
      return this.createWaiting(eventId, userId, event, isPaid, 'NO_SLOTS', roleKey);
    }

    // Eligible + free slot → assign slot (confirmed=true for free events, false for paid)
    const result = await this.prisma.$transaction(async (tx) => {
      const participation = await tx.eventEnrollment.create({
        data: { eventId, userId, wantsIn: true, roleKey },
        include: { user: { select: USER_SELECT } },
      });

      // For free events, auto-confirm. For paid, user must pay first.
      const confirmed = !isPaid;
      await this.slotService.assignSlot(eventId, participation.id, confirmed, tx, roleKey);

      const withSlot = await tx.eventEnrollment.findUnique({
        where: { id: participation.id },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      if (!withSlot) {
        throw new Error('Nie udało się odczytać zgłoszenia po przydzieleniu miejsca');
      }

      return {
        ...withDerivedStatus(withSlot),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
      };
    });

    this.notifyEventChanged(eventId, 'all');
    return result;
  }

  /**
   * Common validation for rejoin operations.
   */
  private validateRejoinEligibility(
    event: JoinEventLike,
    participation: {
      wantsIn: boolean;
      userId: string;
      roleKey?: string | null;
      slot?: { id: string } | null;
    },
    isAdmin = false,
  ): { isPaid: boolean; phase: ReturnType<typeof getEnrollmentPhase>; roleKey?: string } {
    const phase = this.getJoinPhase(event, isAdmin);

    // Block only if participant already has an active slot (CONFIRMED or APPROVED).
    // PENDING participants (wantsIn=true, no slot) should be allowed to rejoin
    // so they can be assigned a free slot.
    if (!isAdmin && participation.wantsIn && participation.slot) {
      throw new BadRequestException('Uczestnik już jest aktywny w tym wydarzeniu');
    }

    return {
      isPaid: false, // Will be set by caller
      phase,
      roleKey: participation.roleKey ?? undefined,
    };
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
      roleConfig?: unknown;
    },
    userId: string,
    isPaid: boolean,
    phase: ReturnType<typeof getEnrollmentPhase>,
    roleKey?: string,
  ) {
    const roleConfig = event.roleConfig as unknown as EventRoleConfig | null;

    // Reset to wanting-in state (update roleKey if provided)
    await this.prisma.eventEnrollment.update({
      where: { id: participationId },
      data: { wantsIn: true, withdrawnBy: null, roleKey },
      include: { user: { select: USER_SELECT }, slot: true },
    });

    // Organizer always gets auto-confirmed slot on rejoin
    if (event.organizerId === userId) {
      await this.slotService.assignSlot(event.id, participationId, true, undefined, roleKey);
      const withSlot = await this.prisma.eventEnrollment.findUnique({
        where: { id: participationId },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      if (!withSlot) {
        throw new Error('Nie udało się odczytać zgłoszenia po przydzieleniu miejsca');
      }
      this.notifyEventChanged(event.id, 'all');
      return {
        ...withDerivedStatus(withSlot),
        isPaid,
        costPerPerson: event.costPerPerson.toNumber(),
      };
    }

    // In pre-enrollment, stay as waiting
    if (phase !== 'OPEN_ENROLLMENT') {
      const withReason = await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'PRE_ENROLLMENT' },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      this.notifyEventChanged(event.id, 'participants');
      return {
        ...withDerivedStatus(withReason),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'PRE_ENROLLMENT' as const,
      };
    }

    // Re-check eligibility on rejoin — user status may have changed since they left
    const [isBanned, isNew] = await Promise.all([
      this.eligibility.isBannedByOrganizer(userId, event.organizerId),
      this.eligibility.isNewUser(userId, event.organizerId),
    ]);

    if (isBanned) {
      const withReason = await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'BANNED' },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      this.notifyEventChanged(event.id, 'participants');
      return {
        ...withDerivedStatus(withReason),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'BANNED' as const,
      };
    }

    if (isNew) {
      const withReason = await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'NEW_USER' },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      this.notifyEventChanged(event.id, 'participants');
      return {
        ...withDerivedStatus(withReason),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'NEW_USER' as const,
      };
    }

    // Check slot availability (role-specific if roleKey provided)
    const freeSlots = await this.slotService.getFreeSlotCount(event.id, roleKey);
    if (freeSlots === 0) {
      // If role-specific and no slots for that role, suggest alternatives
      if (roleKey && roleConfig) {
        const availableRoles = await this.slotService.getAvailableRoles(event.id, roleConfig);
        if (availableRoles.length > 0) {
          const withReason = await this.prisma.eventEnrollment.update({
            where: { id: participationId },
            data: { waitingReason: 'NO_SLOTS_FOR_ROLE' },
            include: { user: { select: USER_SELECT }, slot: true },
          });
          this.notifyEventChanged(event.id, 'participants');
          return {
            ...withDerivedStatus(withReason),
            isPaid,
            costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
            waitingReason: 'NO_SLOTS_FOR_ROLE' as const,
            availableRoles,
          };
        }
      }
      const withReason = await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'NO_SLOTS' },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      this.notifyEventChanged(event.id, 'participants');
      return {
        ...withDerivedStatus(withReason),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'NO_SLOTS' as const,
      };
    }

    // Assign slot
    const confirmed = !isPaid;
    await this.slotService.assignSlot(event.id, participationId, confirmed, undefined, roleKey);

    const withSlot = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { user: { select: USER_SELECT }, slot: true },
    });
    if (!withSlot) {
      throw new Error('Nie udało się odczytać zgłoszenia po przydzieleniu miejsca');
    }

    this.notifyEventChanged(event.id, 'all');

    return {
      ...withDerivedStatus(withSlot),
      isPaid,
      costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
    };
  }

  /**
   * Change the role of an existing participation.
   * Handles all statuses:
   * - WITHDRAWN/REJECTED: rejoin with new role
   * - PENDING: update roleKey, try to get a slot for new role
   * - APPROVED/CONFIRMED: release current slot, update roleKey, try to get new slot
   */
  async changeRole(participationId: string, currentUser: AuthUser, newRoleKey: string) {
    const { userId: currentUserId, isAdmin } = resolveUserContext(currentUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    this.assertCanActOnParticipation(participation, currentUserId, isAdmin);
    this.assertEventMutable(participation.event, isAdmin);

    const event = participation.event;
    const roleConfig = event.roleConfig as unknown as EventRoleConfig | null;

    if (!roleConfig) {
      throw new BadRequestException('To wydarzenie nie ma zdefiniowanych ról');
    }

    const validatedRoleKey = this.validateRoleKey(roleConfig, newRoleKey);
    if (!validatedRoleKey) {
      throw new BadRequestException('Nieprawidłowa rola');
    }

    const isPaid = event.costPerPerson.toNumber() > 0;
    const status = deriveStatus(participation);

    const phase = this.getJoinPhase(event, isAdmin);

    // WITHDRAWN/REJECTED → rejoin with new roleKey
    if (status === 'WITHDRAWN' || status === 'REJECTED') {
      return this.handleRejoin(
        participationId,
        event,
        participation.userId,
        isPaid,
        phase,
        validatedRoleKey,
      );
    }

    // APPROVED/CONFIRMED → release current slot first, then try to get new one
    const hadSlot = !!participation.slot;
    if (hadSlot) {
      await this.prisma.$transaction(async (tx) => {
        await tx.eventEnrollment.update({
          where: { id: participationId },
          data: { roleKey: validatedRoleKey },
        });
        await this.slotService.releaseSlot(participationId, tx);
      });
    } else {
      // PENDING → just update roleKey
      await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { roleKey: validatedRoleKey, waitingReason: null },
      });
    }

    // Re-check eligibility — user status may have changed
    const [isBannedCR, isNewCR] = await Promise.all([
      this.eligibility.isBannedByOrganizer(participation.userId, event.organizerId),
      this.eligibility.isNewUser(participation.userId, event.organizerId),
    ]);

    // Try to assign slot for the new role
    if (phase === 'OPEN_ENROLLMENT') {
      if (isBannedCR) {
        await this.prisma.eventEnrollment.update({
          where: { id: participationId },
          data: { waitingReason: 'BANNED' },
        });
      } else if (isNewCR) {
        await this.prisma.eventEnrollment.update({
          where: { id: participationId },
          data: { waitingReason: 'NEW_USER' },
        });
      } else {
        const freeSlots = await this.slotService.getFreeSlotCount(event.id, validatedRoleKey);
        if (freeSlots > 0) {
          await this.slotService.assignSlot(
            event.id,
            participationId,
            !isPaid,
            undefined,
            validatedRoleKey,
          );
        } else {
          const allFreeSlots = await this.slotService.getFreeSlotCount(event.id);
          const waitingReason = allFreeSlots > 0 ? 'NO_SLOTS_FOR_ROLE' : 'NO_SLOTS';
          await this.prisma.eventEnrollment.update({
            where: { id: participationId },
            data: { waitingReason },
          });
        }
      }
    } else {
      await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'PRE_ENROLLMENT' },
      });
    }

    const updated = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { user: { select: USER_SELECT }, slot: true },
    });

    if (hadSlot) {
      this.notifyWaitingAboutFreeSlot(event.id, event.title);
    }

    this.notifyEventChanged(event.id, 'all');

    return updated
      ? { ...withDerivedStatus(updated), isPaid, costPerPerson: event.costPerPerson.toNumber() }
      : null;
  }

  /**
   * Rejoin an existing participation by its ID (for withdrawn/pending participants).
   * Used by the frontend when re-adding a guest or rejoining as a user
   * — prevents creating a new User entity and bypassing the unique constraint.
   */
  async rejoinById(participationId: string, currentUser: AuthUser) {
    const { userId: currentUserId, isAdmin } = resolveUserContext(currentUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    this.assertCanActOnParticipation(participation, currentUserId, isAdmin);

    const { phase, roleKey } = this.validateRejoinEligibility(
      participation.event,
      participation,
      isAdmin,
    );

    return this.handleRejoin(
      participationId,
      participation.event,
      participation.userId,
      participation.event.costPerPerson.toNumber() > 0,
      phase,
      roleKey,
    );
  }

  private assertCanActOnParticipation(
    participation: { userId: string; addedByUserId: string | null; event: { organizerId: string } },
    currentUserId: string,
    isAdmin = false,
  ): void {
    if (isAdmin) return;
    const isOwner = currentUserId === participation.userId;
    const isHost = currentUserId === participation.addedByUserId;
    const isOrganizer = currentUserId === participation.event.organizerId;
    if (!isOwner && !isHost && !isOrganizer) {
      throw new ForbiddenException('Brak uprawnień do tej operacji');
    }
  }

  private notifyEventChanged(eventId: string, scope: EventRealtimeScope = 'participants'): void {
    this.eventRealtime.invalidateEvent(eventId, scope);
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
        const waiting = await this.prisma.eventEnrollment.findMany({
          where: {
            eventId,
            wantsIn: true,
            slot: null,
          },
          include: { user: { select: USER_SELECT } },
        });

        for (const p of waiting) {
          const recipientId = p.addedByUserId ?? p.userId;
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
