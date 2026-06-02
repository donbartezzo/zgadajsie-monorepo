import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { PaymentsService } from '../payments/payments.service';
import { SlotService } from '../slots/slot.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { ChatService } from '../chat/chat.service';
import { ChatNotificationService } from '../chat/chat-notification.service';
import { isEventEnded, isEventJoinable } from '../events/event-time-status.util';
import { getEnrollmentPhase } from '../events/enrollment-phase.util';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { EventRoleConfig, AvailableRole } from '../slots/slot.types';
import { FakeUsersMonitorService } from '../fake-users/fake-users-monitor.service';
import {
  buildEventUrl,
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
  ENROLLMENT_BLOCKED,
  FAKE_USERS_MIN_FREE_SLOTS_BUFFER,
  DEFAULT_WELCOME_MESSAGE,
} from '@zgadajsie/shared';
import { featureFlags } from '../../common/config/feature-flags';
import { resolveUserContext } from '../auth/utils/auth-user.util';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { USER_SELECT_WITH_EMAIL as USER_SELECT } from '../../common/prisma-selects';

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
    return p.withdrawnBy === 'ORGANIZER' || p.withdrawnBy === 'ADMIN' ? 'REJECTED' : 'WITHDRAWN';
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
    private chatService: ChatService,
    private chatNotificationService: ChatNotificationService,
    private eventRealtime: EventRealtimeService,
    @Optional() private fakeUsersMonitor?: FakeUsersMonitorService,
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
      await this.triggerFakeUserWithdrawIfNeeded(eventId);
      return result;
    }

    // PRE_ENROLLMENT: always waiting (no slot)
    if (phase === 'PRE_ENROLLMENT') {
      const result = await this.createWaiting(
        eventId,
        userId,
        event,
        isPaid,
        'PRE_ENROLLMENT',
        validatedRoleKey,
      );
      this.sendWelcomeMessageIfNeeded(eventId, event.organizerId, userId);
      return result;
    }

    // OPEN_ENROLLMENT: depends on eligibility + slot availability
    const result = await this.handleOpenEnrollmentJoin(
      eventId,
      userId,
      event,
      isPaid,
      validatedRoleKey,
    );
    this.sendWelcomeMessageIfNeeded(eventId, event.organizerId, userId);
    return result;
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

    // Event has roles - roleKey is required
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

  /**
   * Send welcome message if enabled on organizer and event.
   * Fire-and-forget - doesn't block join flow.
   */
  private async sendWelcomeMessageIfNeeded(
    eventId: string,
    organizerId: string,
    userId: string,
  ): Promise<void> {
    setImmediate(async () => {
      try {
        const [organizer, event] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: organizerId },
            select: { welcomeMessage: true, welcomeMessageEnabled: true },
          }),
          this.prisma.event.findUnique({
            where: { id: eventId },
            select: { welcomeMessageEnabled: true },
          }),
        ]);

        if (!organizer || !event) {
          return;
        }

        if (!organizer.welcomeMessageEnabled || !event.welcomeMessageEnabled) {
          return;
        }

        const welcomeBody = organizer.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
        const messageText = `AUTOMATYCZNIE WYGENEROWANA WIADOMOŚĆ POWITALNA ORGANIZATORA:\n\n${welcomeBody}`;
        await this.chatService.createPrivateMessage(eventId, organizerId, userId, messageText);
        await this.chatNotificationService.onNewPrivateMessage(eventId, organizerId, userId);
      } catch (error) {
        this.logger.error(`Failed to send welcome message: ${error}`);
      }
    });
  }

  async joinGuest(
    eventId: string,
    addedByUser: AuthUser,
    displayName: string,
    roleKey?: string,
    avatarSeed?: string,
    userId?: string,
  ) {
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
    const [isHostBanned, isHostTrusted] = isOrganizer
      ? [false, true]
      : await Promise.all([
          this.eligibility.isBannedByOrganizer(addedByUserId, event.organizerId),
          this.eligibility.isTrusted(addedByUserId, event.organizerId),
        ]);

    const guestUser = await this.prisma.user.create({
      data: {
        ...(userId ? { id: userId } : {}),
        email: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@guest.zgadajsie.pl`,
        displayName,
        accountType: 'GUEST',
        avatarSeed: avatarSeed ?? null,
        isActive: false,
      },
    });

    // In open enrollment with free slots → assign slot (confirmed=false, user must confirm)
    if (phase === 'OPEN_ENROLLMENT' && !isHostBanned && isHostTrusted) {
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
        try {
          await this.notifySlotAssigned(addedByUserId, event.title, eventId, guestUser.displayName);
        } catch (err) {
          this.logger.error(`Failed to notify slot assigned for guest: ${err}`);
        }
        return result;
      }
    }

    // No free slots, pre-enrollment, banned host, or new host → waiting list
    const waitingReason = isHostBanned
      ? 'BANNED'
      : !isHostTrusted
        ? 'NOT_TRUSTED'
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

  async updateGuest(
    participationId: string,
    addedByUser: AuthUser,
    changes: { displayName?: string; avatarSeed?: string | null },
  ) {
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

    const data: { displayName?: string; avatarSeed?: string | null } = {};
    if (changes.displayName !== undefined) data.displayName = changes.displayName;
    if (changes.avatarSeed !== undefined) data.avatarSeed = changes.avatarSeed ?? null;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Brak danych do aktualizacji');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: participation.userId },
      data,
    });

    return {
      id: participation.id,
      displayName: updatedUser.displayName,
      avatarSeed: updatedUser.avatarSeed,
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
    const roleConfig = participation.event.roleConfig as unknown as EventRoleConfig | null;

    // Zapisy bez roli w wydarzeniu z roleConfig traktujemy jako zapis na rolę domyślną.
    // Dotyczy to przede wszystkim fake userów dodanych przed wprowadzeniem obsługi ról.
    const effectiveRoleKey =
      roleKey === null && roleConfig
        ? (roleConfig.roles.find((r) => r.isDefault)?.key ?? null)
        : roleKey;

    const freeSlots = await this.slotService.getFreeSlotCount(
      participation.eventId,
      effectiveRoleKey,
    );

    if (freeSlots === 0) {
      if (effectiveRoleKey && roleConfig) {
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
      effectiveRoleKey,
    );

    // Jeśli zastosowano fallback do roli domyślnej, utrwal ją w enrollment dla spójności danych
    const enrollmentUpdateData: { waitingReason: null; roleKey?: string } = {
      waitingReason: null,
    };
    if (effectiveRoleKey !== roleKey && effectiveRoleKey !== null) {
      enrollmentUpdateData.roleKey = effectiveRoleKey;
    }

    const updated = await this.prisma.eventEnrollment.update({
      where: { id: participationId },
      data: enrollmentUpdateData,
      include: {
        user: { select: USER_SELECT },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // Brak auto-trust: zaufanie nadaje organizator wyłącznie świadomie i ręcznie.
    // Po przydzieleniu slotu sygnalizujemy tylko, czy real user nie jest jeszcze
    // zaufany - frontend zapyta wtedy organizatora w modalu.
    // Goście (addedByUserId != null) to wirtualne konta - zaufanie ich nie dotyczy.
    let needsTrustDecision = false;
    if (!participation.addedByUserId) {
      const relation = await this.prisma.organizerUserRelation.findUnique({
        where: {
          organizerUserId_targetUserId: {
            organizerUserId: participation.event.organizerId,
            targetUserId: participation.userId,
          },
        },
        select: { isTrusted: true, isBanned: true },
      });
      needsTrustDecision = !relation?.isTrusted && !relation?.isBanned;
    }

    this.notifyEventChanged(participation.eventId, 'all');

    // Notify only in OPEN_ENROLLMENT (not during pre-enrollment)
    if (phase === 'OPEN_ENROLLMENT' && updated) {
      const recipientId = updated.addedByUserId ?? updated.userId;
      const guestDisplayName = updated.addedByUserId ? updated.user.displayName : undefined;
      await this.notifySlotAssigned(
        recipientId,
        updated.event.title,
        updated.eventId,
        guestDisplayName,
      );
    }

    return { ...updated, needsTrustDecision };
  }

  /**
   * User confirms their slot (acknowledges they want to participate).
   * Organizer and admin can also confirm on behalf of the user.
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
        event: { select: { id: true, title: true, city: { select: { slug: true } } } },
        slot: true,
      },
    });

    this.pushService
      .notifyParticipationStatus(
        participation.userId,
        participation.event.title,
        'CONFIRMED',
        participation.eventId,
      )
      .catch((err) => this.logger.error(`Failed to send CONFIRMED notification: ${err}`));

    this.notifyEventChanged(participation.eventId, 'all');

    // Send confirmation email
    if (updated?.user && updated.event) {
      const eventLink = buildEventUrl(updated.event.city.slug, updated.event.id);
      this.emailService
        .sendParticipationStatusEmail(
          updated.user.email,
          updated.user.displayName,
          updated.event.title,
          'CONFIRMED',
          eventLink,
        )
        .catch((err) => this.logger.error(`Failed to send confirmation email: ${err}`));
    }

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
      throw new BadRequestException(ENROLLMENT_BLOCKED.EVENT_NOT_ACTIVE);
    }

    if (!isEventJoinable(event)) {
      throw new BadRequestException(ENROLLMENT_BLOCKED.EVENT_STARTED);
    }

    const phase = getEnrollmentPhase(event);
    if (phase === 'LOTTERY_PENDING') {
      throw new BadRequestException(ENROLLMENT_BLOCKED.LOTTERY_PENDING);
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
    if (!isAdmin) {
      if (event.status === 'CANCELLED') {
        throw new BadRequestException(EVENT_CANCELLED_MESSAGE);
      }
      if (isEventEnded(event)) {
        throw new BadRequestException(EVENT_ENDED_MESSAGE);
      }
    }
  }

  /**
   * Create a waiting participation (no slot assigned).
   * @param waitingReason - Why user didn't get automatic slot: NOT_TRUSTED, BANNED, NO_SLOTS, NO_SLOTS_FOR_ROLE, PRE_ENROLLMENT
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
    waitingReason?: 'NOT_TRUSTED' | 'BANNED' | 'NO_SLOTS' | 'NO_SLOTS_FOR_ROLE' | 'PRE_ENROLLMENT',
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
        eventId,
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
    await this.triggerFakeUserWithdrawIfNeeded(eventId);
    return result;
  }

  /**
   * Handle open enrollment join - assign slot if eligible and available.
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
    const [isBanned, isTrusted] = await Promise.all([
      this.eligibility.isBannedByOrganizer(userId, event.organizerId),
      this.eligibility.isTrusted(userId, event.organizerId),
    ]);

    const roleConfig = event.roleConfig as EventRoleConfig | null;

    // Banned users go to waiting list (organizer will reject)
    if (isBanned) {
      return this.createWaiting(eventId, userId, event, isPaid, 'BANNED', roleKey);
    }

    // Not trusted users need organizer approval
    if (!isTrusted) {
      return this.createWaiting(eventId, userId, event, isPaid, 'NOT_TRUSTED', roleKey);
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

    // Eligible + free slot → assign slot (confirmed=true because user self-assigns)
    const result = await this.prisma.$transaction(async (tx) => {
      const participation = await tx.eventEnrollment.create({
        data: { eventId, userId, wantsIn: true, roleKey },
        include: { user: { select: USER_SELECT } },
      });

      // User joins directly → auto-confirm (payment is tracked separately)
      await this.slotService.assignSlot(eventId, participation.id, true, tx, roleKey);

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
    await this.triggerFakeUserWithdrawIfNeeded(eventId);
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

    // Re-check eligibility on rejoin - user status may have changed since they left
    const [isBanned, isTrusted] = await Promise.all([
      this.eligibility.isBannedByOrganizer(userId, event.organizerId),
      this.eligibility.isTrusted(userId, event.organizerId),
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

    if (!isTrusted) {
      const withReason = await this.prisma.eventEnrollment.update({
        where: { id: participationId },
        data: { waitingReason: 'NOT_TRUSTED' },
        include: { user: { select: USER_SELECT }, slot: true },
      });
      this.notifyEventChanged(event.id, 'participants');
      return {
        ...withDerivedStatus(withReason),
        isPaid,
        costPerPerson: isPaid ? event.costPerPerson.toNumber() : 0,
        waitingReason: 'NOT_TRUSTED' as const,
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

    // Rejoin assigns a slot but user must explicitly confirm participation again.
    // This applies both when the user rejoins themselves and when an organizer/host
    // re-adds them — the participant remains APPROVED with slot.confirmed=false
    // until they tap "Potwierdź uczestnictwo".
    await this.slotService.assignSlot(event.id, participationId, false, undefined, roleKey);

    const withSlot = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { user: { select: USER_SELECT }, slot: true },
    });
    if (!withSlot) {
      throw new Error('Nie udało się odczytać zgłoszenia po przydzieleniu miejsca');
    }

    this.notifyEventChanged(event.id, 'all');
    // Notify user about slot assignment on rejoin
    await this.notifySlotAssigned(userId, event.title, event.id);

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

    // Re-check eligibility - user status may have changed
    const [isBannedCR, isTrustedCR] = await Promise.all([
      this.eligibility.isBannedByOrganizer(participation.userId, event.organizerId),
      this.eligibility.isTrusted(participation.userId, event.organizerId),
    ]);

    // Try to assign slot for the new role
    if (phase === 'OPEN_ENROLLMENT') {
      if (isBannedCR) {
        await this.prisma.eventEnrollment.update({
          where: { id: participationId },
          data: { waitingReason: 'BANNED' },
        });
      } else if (!isTrustedCR) {
        await this.prisma.eventEnrollment.update({
          where: { id: participationId },
          data: { waitingReason: 'NOT_TRUSTED' },
        });
      } else {
        const freeSlots = await this.slotService.getFreeSlotCount(event.id, validatedRoleKey);
        if (freeSlots > 0) {
          // User initiates role change → auto-confirm
          await this.slotService.assignSlot(
            event.id,
            participationId,
            true,
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
   * - prevents creating a new User entity and bypassing the unique constraint.
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
    guestDisplayName?: string,
  ): Promise<void> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { city: { select: { slug: true } } },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, displayName: true },
      });
      if (!user) {
        return;
      }
      const eventLink = event ? buildEventUrl(event.city.slug, eventId) : undefined;
      const displayTitle = guestDisplayName
        ? `${eventTitle} (gość: ${guestDisplayName})`
        : eventTitle;
      await this.pushService.notifyParticipationStatus(
        recipientId,
        displayTitle,
        'SLOT_ASSIGNED',
        eventId,
      );
      await this.emailService.sendParticipationStatusEmail(
        user.email,
        user.displayName,
        displayTitle,
        'SLOT_ASSIGNED',
        eventLink,
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
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { city: { select: { slug: true } } },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, displayName: true, accountType: true },
      });
      if (!user) {
        return;
      }
      // Skip powiadomień dla fake users
      if (user.accountType === 'FAKE') {
        return;
      }
      const eventLink = event ? buildEventUrl(event.city.slug, eventId) : undefined;
      await this.pushService.notifyParticipationStatus(recipientId, eventTitle, 'REMOVED', eventId);
      await this.emailService.sendParticipationStatusEmail(
        user.email,
        user.displayName,
        eventTitle,
        'REMOVED',
        eventLink,
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

  private async triggerFakeUserWithdrawIfNeeded(eventId: string): Promise<void> {
    if (!this.fakeUsersMonitor || !featureFlags.enableFakeUsers) {
      return;
    }

    // Sprawdź czy brakuje wolnych miejsc (z uwzględnieniem bufora)
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { maxParticipants: true },
    });

    if (!event) {
      return;
    }

    const activeEnrollments = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
      },
    });

    const freePlaces = event.maxParticipants - activeEnrollments;

    // Jeśli brak wolnych miejsc (mniej niż bufor), zaplanuj withdrawal fake usera
    if (freePlaces < FAKE_USERS_MIN_FREE_SLOTS_BUFFER) {
      try {
        await this.fakeUsersMonitor.monitorSingleEvent(eventId);
      } catch (err) {
        this.logger.error(`Failed to trigger fake user withdrawal for event ${eventId}: ${err}`);
      }
    }
  }

  async adminWithdrawUser(enrollmentId: string, adminUser: AuthUser): Promise<void> {
    const { isAdmin } = resolveUserContext(adminUser);

    if (!isAdmin) {
      throw new ForbiddenException('Tylko administrator może wypisać użytkownika');
    }

    const enrollment = await this.prisma.eventEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { event: true, user: true, slot: true },
    });

    if (!enrollment) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }

    // Fake user: withdrawnBy = USER, brak powiadomienia
    if (enrollment.user.accountType === 'FAKE') {
      await this.prisma.eventEnrollment.update({
        where: { id: enrollmentId },
        data: {
          wantsIn: false,
          withdrawnBy: 'USER',
        },
      });
      return;
    }

    // Real user: withdrawnBy = ADMIN, powiadomienie "administrator serwisu"
    await this.prisma.eventEnrollment.update({
      where: { id: enrollmentId },
      data: {
        wantsIn: false,
        withdrawnBy: 'ADMIN',
      },
    });

    // Powiadomienie użytkownika
    await this.emailService.sendParticipationStatusEmail(
      enrollment.user.email,
      enrollment.user.displayName,
      enrollment.event.title,
      'REJECTED',
      'Administrator serwisu wypisał Cię z tego wydarzenia.',
    );

    await this.pushService.notifyParticipationStatus(
      enrollment.userId,
      enrollment.event.title,
      'REJECTED',
      'Administrator serwisu wypisał Cię z tego wydarzenia.',
    );

    this.notifyEventChanged(enrollment.eventId, 'participants');
  }
}
