import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { UpperCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ModalComponent } from '../../../ui/modal/modal.component';
import { ModalService } from '../../../ui/modal/modal.service';
import { UserProfileCardComponent } from '../../../user/ui/user-profile-card/user-profile-card.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import {
  SlotDisplayStatus,
  SlotStatusConfig,
  SlotColorClasses,
  SLOT_STATUS_CONFIG,
  getSlotColorClasses,
} from '../../slot-status-config';
import { LinkedParticipantChipComponent } from '../linked-participant-chip/linked-participant-chip.component';
import { StatusIndicatorComponent } from '../../../ui/status-indicator/status-indicator.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { AdminService } from '../../../../core/services/admin.service';
import { ModerationService } from '../../../../core/services/moderation.service';
import { SnackbarService, SnackbarType } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { BottomOverlaysService } from '../../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';
import { ProfileBroadcastService } from '../../../../core/services/profile-broadcast.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { UserProfileEditService } from '../../../user/services/user-profile-edit.service';
import { Enrollment, EnrolleeManageItem, OrganizerUserRelation } from '../../../types';
import { Event } from '../../../types/event.interface';
import { EventSlotInfo } from '../../../types/payment.interface';
import { formatDateTime, type StatusBadgeEntry } from '@zgadajsie/shared';

export interface EnrollmentModalUserInfo {
  id: string;
  displayName: string;
}

export interface EnrollmentModalData {
  participant: Enrollment | EnrolleeManageItem | null;
  slot: EventSlotInfo | null;
  event: Event;
  allParticipants?: (Enrollment | EnrolleeManageItem)[];
  userInfo?: EnrollmentModalUserInfo | null;
}

/** @deprecated Use EnrollmentModalUserInfo */
export type ParticipantModalUserInfo = EnrollmentModalUserInfo;

/** @deprecated Use EnrollmentModalData */
export type ParticipantModalData = EnrollmentModalData;

type EnrollmentItem = Enrollment | EnrolleeManageItem;

function isManageItem(p: EnrollmentItem): p is EnrolleeManageItem {
  return 'payment' in p && !!(p as EnrolleeManageItem).user;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    typeof (err as { error: unknown }).error === 'object' &&
    (err as { error: { message?: unknown } }).error !== null &&
    typeof (err as { error: { message?: unknown } }).error?.message === 'string'
  ) {
    return (err as { error: { message: string } }).error.message;
  }
  return fallback;
}

@Component({
  selector: 'app-enrollment-slot-modal',
  imports: [
    ModalComponent,
    UserProfileCardComponent,
    ButtonComponent,
    IconComponent,
    UpperCasePipe,
    TranslocoPipe,
    LinkedParticipantChipComponent,
    StatusIndicatorComponent,
  ],
  templateUrl: './enrollment-slot-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentSlotModalComponent {
  private readonly navigation = inject(NavigationService);
  protected readonly modalService = inject(ModalService);
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly adminService = inject(AdminService);
  private readonly moderationService = inject(ModerationService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly overlays = inject(BottomOverlaysService);
  readonly eventArea = inject(EventAreaService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);
  private readonly profileEdit = inject(UserProfileEditService);

  readonly data = input<EnrollmentModalData | null>(null);

  readonly loading = signal(false);
  readonly isSavingProfile = signal(false);
  readonly selectedOrganizerAction = signal('');
  readonly organizerRelation = signal<OrganizerUserRelation | null | undefined>(undefined);

  readonly event = computed(() => this.data()?.event ?? null);
  readonly participant = computed(() => this.data()?.participant ?? null);
  readonly slot = computed(() => this.data()?.slot ?? null);
  readonly allParticipants = computed(() => this.data()?.allParticipants ?? []);
  readonly modalUserInfo = computed(() => this.data()?.userInfo ?? null);

  readonly isNonParticipantView = computed(() => !this.participant() && !!this.modalUserInfo());

  readonly hostParticipant = computed(() => {
    const p = this.participant();
    if (!p?.isGuest || !p.addedByUser?.id) return null;
    const addedByUserId = p.addedByUser.id;
    return this.allParticipants().find((ap) => ap.userId === addedByUserId) ?? null;
  });

  readonly hostUserInfo = computed(() => {
    if (this.hostParticipant()) return null;
    const p = this.participant();
    if (!p?.isGuest) return null;
    const added = (p as Enrollment).addedByUser ?? (p as EnrolleeManageItem).addedByUser;
    return added ?? null;
  });

  readonly guestParticipants = computed(() => {
    const p = this.participant();
    if (!p || p.isGuest) return [];
    return this.allParticipants().filter((ap) => ap.isGuest && ap.addedByUser?.id === p.userId);
  });

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly isOrganizer = computed(() => {
    const userId = this.currentUserId();
    const e = this.event();
    return !!userId && e?.organizerId === userId;
  });

  readonly isAdmin = computed(() => this.auth.isAdmin());

  readonly isCurrentUserParticipant = computed(() => {
    const p = this.participant();
    return !!p && p.userId === this.currentUserId();
  });

  readonly isGuestHost = computed(() => {
    const p = this.participant();
    if (!p?.isGuest) return false;
    return p.addedByUser?.id === this.currentUserId();
  });

  readonly isActiveStatus = computed(() => {
    const s = this.participant()?.status;
    return s === 'APPROVED' || s === 'CONFIRMED';
  });

  readonly isWithdrawnStatus = computed(() => {
    const s = this.participant()?.status;
    return s === 'WITHDRAWN' || s === 'REJECTED';
  });

  readonly isWithdrawnByAdmin = computed(() => {
    const p = this.participant();
    if (!p) return false;
    return 'withdrawnBy' in p && p.withdrawnBy === 'ADMIN';
  });

  readonly isBanned = computed(
    () => (this.participant() as Enrollment)?.waitingReason === 'BANNED',
  );

  readonly waitingReason = computed(
    () => (this.participant() as Enrollment)?.waitingReason ?? null,
  );

  readonly slotId = computed(() => this.slot()?.id ?? null);
  readonly slotLocked = computed(() => this.slot()?.locked ?? false);

  readonly paymentInfo = computed(() => {
    const p = this.participant();
    if (p && isManageItem(p)) return p.payment;
    return null;
  });

  readonly paymentStatusLabel = computed(() => {
    const payment = this.paymentInfo();
    if (!payment) return '';
    switch (payment.status) {
      case 'COMPLETED':
        return `Opłacone (${payment.amount} zł)`;
      case 'VOUCHER_REFUNDED':
        return 'Zwrócone (voucher)';
      case 'REFUNDED':
        return 'Zwrócone';
      default:
        return payment.status;
    }
  });

  readonly slotIsEmpty = computed(() => {
    const s = this.slot();
    return !s || (!s.enrollmentId && !s.locked);
  });

  readonly slotDisplayStatus = computed<SlotDisplayStatus>(() => {
    const p = this.participant();
    if (!p) {
      return this.modalUserInfo() ? 'non-participant' : 'free';
    }
    const s = p.status;
    if (s === 'PENDING') return 'pending';
    if (s === 'WITHDRAWN' || s === 'REJECTED') return 'withdrawn';
    return 'assigned';
  });

  readonly slotStatusConfig = computed<SlotStatusConfig>(
    () => SLOT_STATUS_CONFIG[this.slotDisplayStatus()],
  );

  readonly colorClasses = computed<SlotColorClasses>(() =>
    getSlotColorClasses(this.slotStatusConfig().status),
  );

  readonly participationUpdatedAt = computed(() => {
    const p = this.participant();
    if (!p) return null;
    if ('updatedAt' in p && p.updatedAt) return formatDateTime(p.updatedAt as string);
    if ('approvedAt' in p && p.approvedAt) return formatDateTime(p.approvedAt as string);
    if ('createdAt' in p && p.createdAt) return formatDateTime(p.createdAt as string);
    return null;
  });

  readonly canJoinPublic = computed(() => {
    if (this.isCurrentUserParticipant()) return false;
    if (this.participant()) return false;
    if (this.isNonParticipantView()) return false;
    if (!this.slotIsEmpty()) return false;
    return this.eventArea.canJoin();
  });

  readonly canRejoin = computed(() => {
    if (!this.isCurrentUserParticipant()) return false;
    if (!this.isWithdrawnStatus()) return false;
    if (this.isBanned()) return false;
    return this.eventArea.canJoin();
  });

  readonly eventHasRoles = computed(() => {
    const roles = this.event()?.roleConfig?.roles;
    return Array.isArray(roles) && roles.length > 0;
  });

  readonly canChangeRole = computed(() => {
    const canAct = this.isCurrentUserParticipant() || this.isGuestHost();
    if (!canAct) return false;
    if (!this.eventHasRoles()) return false;
    const s = this.participant()?.status;
    return s === 'PENDING' || s === 'APPROVED' || s === 'CONFIRMED';
  });

  readonly canGuestRejoin = computed(() => {
    if (!this.isGuestHost()) return false;
    if (!this.isWithdrawnStatus()) return false;
    return this.eventArea.canJoin();
  });

  readonly isViewOnlyParticipant = computed(() => {
    if (!this.participant()) return false;
    if (this.isWithdrawnStatus()) return false;
    if (this.isCurrentUserParticipant()) return false;
    if (this.isGuestHost()) return false;
    if (this.slotLocked()) return false;
    return true;
  });

  readonly isPaidEvent = computed(() => (this.event()?.costPerPerson ?? 0) > 0);

  readonly trustStatus = computed(() => {
    const relation = this.organizerRelation();
    if (relation === undefined) return null;
    const isTrusted = relation?.isTrusted ?? false;
    const trustedAt = relation?.trustedAt ?? null;
    return {
      isTrusted,
      trustedAt: trustedAt ? formatDateTime(trustedAt) : null,
      label: isTrusted ? 'Uczestnik oznaczony jako zaufany' : 'Brak statusu zaufania',
      class: isTrusted
        ? 'border-success-200 bg-success-50 text-success-700'
        : 'border-neutral-200 bg-neutral-100 text-neutral-600',
    };
  });

  readonly banDate = computed(() => {
    const relation = this.organizerRelation();
    if (!relation?.bannedAt) return null;
    return formatDateTime(relation.bannedAt);
  });

  readonly participantExtraBadges = computed<StatusBadgeEntry[]>(() => {
    const badges: StatusBadgeEntry[] = [];
    const trust = this.trustStatus();
    if (trust?.isTrusted)
      badges.push({ type: 'trusted', detail: trust.trustedAt ? `od ${trust.trustedAt}` : null });
    const banDate = this.banDate();
    if (banDate) badges.push({ type: 'banned', detail: banDate });
    return badges;
  });

  readonly organizerActions = computed(() => {
    type Action = { value: string; label: string };

    const p = this.participant();
    const slotId = this.slotId();

    if (!this.isOrganizer() && !this.isAdmin()) return [];

    if (!p) {
      if (!slotId) return [];

      const slotLocked = this.slotLocked();

      const slotActions: Action[] = [];
      if (!slotLocked) {
        slotActions.push({ value: 'lockSlot', label: 'Zablokuj slot' });
      } else {
        slotActions.push({ value: 'unlockSlot', label: 'Odblokuj slot' });
      }

      return slotActions.length > 0 ? [{ label: 'Slot', actions: slotActions }] : [];
    }

    const status = p.status;
    const isActive = status === 'APPROVED' || status === 'CONFIRMED';
    const isWithdrawn = this.isWithdrawnStatus();
    const isBanned = this.isBanned();
    const isPaid = this.isPaidEvent();
    const payment = this.paymentInfo();
    const slotLocked = this.slotLocked();
    const trustStatus = this.trustStatus();
    const isTrusted = trustStatus?.isTrusted ?? false;

    const transitions: Action[] = [];
    if (status === 'PENDING' && !isBanned) {
      transitions.push({ value: 'approve', label: 'Zatwierdź uczestnika' });
      transitions.push({ value: 'reject', label: 'Odrzuć uczestnika' });
    }
    if (isActive) {
      transitions.push({ value: 'kick', label: 'Wypisz uczestnika' });
    }
    if (this.isAdmin() && isActive) {
      transitions.push({ value: 'adminWithdraw', label: 'Wypisz przez admina (z powiadomieniem)' });
    }
    if (isWithdrawn && !isBanned) {
      transitions.push({ value: 'rejoinParticipant', label: 'Przywróć uczestnika' });
    }
    if (this.eventHasRoles() && (isActive || status === 'PENDING') && !isBanned) {
      transitions.push({ value: 'changeRole', label: 'Zmień rolę uczestnika' });
    }

    const communication: Action[] = [];
    if (isActive) {
      communication.push({ value: 'chat', label: 'Napisz wiadomość' });
    }

    const payments: Action[] = [];
    if (isPaid && !payment && status === 'APPROVED') {
      payments.push({ value: 'markPaid', label: 'Oznacz jako opłacone' });
    }
    if (payment?.status === 'COMPLETED') {
      payments.push({ value: 'cancelPayment', label: 'Anuluj płatność' });
    }

    const slotActions: Action[] = [];
    if (slotId && !slotLocked) {
      slotActions.push({ value: 'lockSlot', label: 'Zablokuj slot' });
    }
    if (slotId && slotLocked) {
      slotActions.push({ value: 'unlockSlot', label: 'Odblokuj slot' });
    }

    const moderation: Action[] = [];
    if (!isWithdrawn && !isBanned) {
      moderation.push({ value: 'ban', label: 'Zbanuj uczestnika' });
    }
    if (isBanned) {
      moderation.push({ value: 'unban', label: 'Zdejmij bana' });
    }
    if (trustStatus) {
      moderation.push({
        value: isTrusted ? 'untrust' : 'trust',
        label: isTrusted ? 'Cofnij zaufanie' : 'Oznacz jako zaufanego',
      });
    }

    const destructive: Action[] = [];
    if (payment?.status !== 'COMPLETED') {
      destructive.push({ value: 'deleteEnrollment', label: 'Usuń zgłoszenie' });
    }

    return [
      { label: 'Uczestnictwo', actions: transitions },
      { label: 'Komunikacja', actions: communication },
      { label: 'Płatności', actions: payments },
      { label: 'Slot', actions: slotActions },
      { label: 'Moderacja', actions: moderation },
      { label: 'Zaawansowane', actions: destructive },
    ].filter((g) => g.actions.length > 0);
  });

  async onOrganizerAction(value: string): Promise<void> {
    this.selectedOrganizerAction.set('');
    switch (value) {
      case 'approve':
        return this.onApprove();
      case 'reject':
        return this.onReject();
      case 'kick':
        return this.onKick();
      case 'adminWithdraw':
        return this.onAdminWithdraw();
      case 'rejoinParticipant':
        return this.onOrganizerRejoin();
      case 'changeRole':
        return this.onOrganizerChangeRole();
      case 'chat':
        return this.onChat();
      case 'markPaid':
        return this.onMarkPaid();
      case 'cancelPayment':
        return this.onCancelPayment();
      case 'lockSlot':
        return this.onLockSlot();
      case 'unlockSlot':
        return this.onUnlockSlot();
      case 'ban':
        return this.onBan();
      case 'unban':
        return this.onUnban();
      case 'trust':
        return this.updateTrustStatus(true);
      case 'untrust':
        return this.updateTrustStatus(false);
      case 'deleteEnrollment':
        return this.onDeleteEnrollment();
    }
  }

  private async onApprove(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    await this.executeAction(
      this.eventService.assignSlot(p.id),
      'Zatwierdzono uczestnika',
      'Nie udało się zatwierdzić',
    );
  }

  private async onReject(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    await this.executeAction(
      this.eventService.releaseSlot(p.id),
      'Odrzucono uczestnika',
      'Nie udało się odrzucić',
      'info',
    );
  }

  private async onKick(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisać uczestnika?',
      message: `Użytkownik ${name} zostanie wypisany z wydarzenia, a jego miejsce zwolnione.`,
      confirmLabel: 'Wypisz',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.eventService.releaseSlot(p.id),
      'Uczestnik wypisany z wydarzenia',
      'Nie udało się wypisać uczestnika',
      'info',
    );
  }

  private async onAdminWithdraw(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisać uczestnika przez admina?',
      message: `Użytkownik ${name} zostanie wypisany z wydarzenia przez administratora serwisu z powiadomieniem.`,
      confirmLabel: 'Wypisz',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.adminService.adminWithdrawUser(p.id),
      'Uczestnik wypisany przez admina',
      'Nie udało się wypisać uczestnika',
      'info',
    );
  }

  private async onMarkPaid(): Promise<void> {
    const p = this.participant();
    const e = this.event();
    if (!p || !e) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Oznacz jako opłacone',
      message: 'Czy na pewno chcesz oznaczyć tego uczestnika jako opłaconego (gotówka)?',
      confirmLabel: 'Tak, oznacz',
      color: 'info',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.eventService.markAsPaid(e.id, p.id),
      'Oznaczono jako opłacone',
      'Nie udało się oznaczyć',
    );
  }

  private onCancelPayment(): void {
    const p = this.participant();
    if (!p || !isManageItem(p) || !p.payment) return;
    this.modalService.close();
    this.overlays.openCancelPayment(p.payment, p.user.displayName);
    this.modalService.requestRefresh();
  }

  private async onLockSlot(): Promise<void> {
    const slotId = this.slotId();
    if (!slotId) return;
    await this.executeAction(
      this.eventService.lockSlot(slotId),
      'Slot zablokowany',
      'Nie udało się zablokować slotu',
    );
  }

  private async onUnlockSlot(): Promise<void> {
    const slotId = this.slotId();
    if (!slotId) return;
    await this.executeAction(
      this.eventService.unlockSlot(slotId),
      'Slot odblokowany',
      'Nie udało się odblokować slotu',
    );
  }

  private async onBan(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: 'Zbanować uczestnika?',
      message: `Użytkownik ${name} zostanie zbanowany we wszystkich Twoich wydarzeniach i nie będzie mógł zajmować slotów.`,
      confirmLabel: 'Zbanuj',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.moderationService.banUser(p.userId, 'Ban od organizatora'),
      'Uczestnik zbanowany',
      'Nie udało się zbanować',
      'info',
    );
  }

  private async onUnban(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Zdjąć bana?',
      message: 'Użytkownik odzyska możliwość zajmowania slotów w Twoich wydarzeniach.',
      confirmLabel: 'Zdejmij bana',
      cancelLabel: 'Anuluj',
      color: 'primary',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.moderationService.unbanUser(p.userId),
      'Ban zdjęty',
      'Nie udało się zdjąć bana',
      'info',
    );
  }

  private async onOrganizerRejoin(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: 'Przywrócić uczestnika?',
      message: `Użytkownik ${name} zostanie ponownie dołączony do wydarzenia.`,
      confirmLabel: 'Przywróć',
      cancelLabel: 'Anuluj',
      color: 'primary',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.eventService.rejoinEnrollment(p.id),
      'Uczestnik przywrócony',
      'Nie udało się przywrócić uczestnika',
    );
  }

  private onOrganizerChangeRole(): void {
    const p = this.participant();
    if (!p) return;
    this.modalService.close();
    this.eventArea.openChangeRoleWizardForParticipant(p as Enrollment);
  }

  private async updateTrustStatus(shouldTrust: boolean): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: shouldTrust ? 'Oznaczyć jako zaufanego?' : 'Cofnąć status zaufanego?',
      message: shouldTrust
        ? `Użytkownik ${name} zostanie oznaczony jako zaufany w Twoich wydarzeniach.`
        : `Użytkownik ${name} straci status zaufanego w Twoich wydarzeniach.`,
      confirmLabel: shouldTrust ? 'Oznacz' : 'Cofnij',
      cancelLabel: 'Anuluj',
      color: shouldTrust ? 'success' : 'warning',
    });
    if (!confirmed) return;
    await this.executeAction(
      shouldTrust
        ? this.moderationService.trustUser(p.userId)
        : this.moderationService.untrustUser(p.userId),
      shouldTrust ? 'Uczestnik oznaczony jako zaufany' : 'Status zaufania cofnięty',
      shouldTrust ? 'Nie udało się oznaczyć jako zaufanego' : 'Nie udało się cofnąć zaufania',
      'success',
    );
  }

  private async onDeleteEnrollment(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const name = p.user?.displayName ?? 'uczestnika';
    const confirmed = await this.confirmModal.confirm({
      title: 'Usunąć zgłoszenie?',
      message: `Zgłoszenie użytkownika ${name} zostanie trwale usunięte. Tej operacji nie można cofnąć. Możliwe tylko dla zgłoszeń bez historii płatności.`,
      confirmLabel: 'Usuń zgłoszenie',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.eventService.deleteEnrollment(p.id),
      'Zgłoszenie zostało usunięte',
      'Nie udało się usunąć zgłoszenia',
      'info',
    );
  }

  private onChat(): void {
    const p = this.participant();
    const e = this.event();
    if (!p || !e) return;
    this.modalService.close();
    this.navigation.navigateToEventOrganizerChat(e.id, e.city?.slug ?? '', p.userId);
  }

  onJoin(): void {
    this.modalService.close();
    const roleKey = this.slot()?.roleKey ?? undefined;
    this.eventArea.openJoinWizardWithRole(roleKey);
  }

  onRejoin(): void {
    const p = this.participant() as Enrollment;
    if (!p) return;
    this.modalService.close();
    if (this.eventHasRoles()) {
      this.eventArea.openChangeRoleWizardForParticipant(p);
    } else {
      this.eventArea.rejoinParticipantDirect(p);
    }
  }

  onRejoinGuest(): void {
    const p = this.participant() as Enrollment;
    if (!p) return;
    this.modalService.close();
    if (this.eventHasRoles()) {
      this.eventArea.openChangeRoleWizardForParticipant(p);
    } else {
      this.eventArea.rejoinParticipantDirect(p);
    }
  }

  async onLeave(): Promise<void> {
    this.modalService.close();
    await this.eventArea.requestLeave();
  }

  async onRemoveGuest(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisać gościa?',
      message: 'Czy na pewno chcesz wypisać tę osobę z wydarzenia?',
      confirmLabel: 'Tak, wypisz',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;
    await this.executeAction(
      this.eventService.leaveEnrollment(p.id),
      'Gość wypisany z wydarzenia',
      'Nie udało się wypisać gościa',
      'info',
    );
  }

  async onChangeRole(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    if (this.isActiveStatus()) {
      const confirmed = await this.confirmModal.confirm({
        title: 'Zmienić rolę?',
        message:
          'Zmiana roli zwolni Twoje obecne miejsce. Jeśli nie ma wolnych slotów dla nowej roli, trafisz na listę oczekujących.',
        confirmLabel: 'Zmień rolę',
        cancelLabel: 'Anuluj',
        color: 'warning',
      });
      if (!confirmed) return;
    }
    this.modalService.close();
    this.eventArea.openChangeRoleWizardForParticipant(p as Enrollment);
  }

  onContactOrganizer(): void {
    this.modalService.close();
    this.eventArea.contactOrganizer();
  }

  readonly canEditProfileInModal = computed(() => {
    const currentUserId = this.auth.currentUser()?.id ?? null;
    const p = this.participant();
    if (!p || !p.user) return false;
    if (currentUserId && p.user.id === currentUserId) return true;
    if (p.isGuest && p.id && this.isGuestHost()) return true;
    return false;
  });

  async onDisplayNameChange(displayName: string): Promise<void> {
    await this.executeProfileEdit((p) =>
      this.profileEdit.commitDisplayName({
        user: p.user,
        displayName,
        isGuest: p.isGuest,
        participationId: p.id,
      }),
    );
  }

  async onAvatarSeedChange(avatarSeed: string): Promise<void> {
    await this.executeProfileEdit((p) =>
      this.profileEdit.commitAvatarSeed({
        user: p.user,
        avatarSeed,
        isGuest: p.isGuest,
        participationId: p.id,
      }),
    );
  }

  private async executeProfileEdit(
    editFn: (p: Enrollment | EnrolleeManageItem) => Promise<void>,
  ): Promise<void> {
    const p = this.participant();
    if (!p || !p.user) return;
    this.isSavingProfile.set(true);
    try {
      await editFn(p);
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  private async executeAction(
    request$: Observable<unknown>,
    successMsg: string,
    errorMsg: string,
    successType: SnackbarType = 'success',
  ): Promise<void> {
    this.loading.set(true);
    try {
      await firstValueFrom(request$);
      this.snackbar.show(successMsg, successType);
      this.closeAndRefresh();
    } catch (err: unknown) {
      this.snackbar.error(getErrorMessage(err, errorMsg));
    } finally {
      this.loading.set(false);
    }
  }

  private closeAndRefresh(): void {
    this.modalService.close();
    this.modalService.requestRefresh();
  }
}
