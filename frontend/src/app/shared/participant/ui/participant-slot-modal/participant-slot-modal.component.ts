import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ModalComponent } from '../../../ui/modal/modal.component';
import { ModalService } from '../../../ui/modal/modal.service';
import {
  UserProfileCardComponent,
  ProfileEditData,
} from '../../../user/ui/user-profile-card/user-profile-card.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { SlotDisplayStatus, SlotStatusConfig, SLOT_STATUS_CONFIG } from '../../slot-status-config';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { UserService } from '../../../../core/services/user.service';
import { ModerationService } from '../../../../core/services/moderation.service';
import { SnackbarService, SnackbarType } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { BottomOverlaysService } from '../../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';
import { ProfileBroadcastService } from '../../../../core/services/profile-broadcast.service';
import { Participation, ParticipantManageItem, OrganizerUserRelation } from '../../../types';
import { Event } from '../../../types/event.interface';
import { EventSlotInfo } from '../../../types/payment.interface';
import { formatDateTime } from '@zgadajsie/shared';

export interface ParticipantModalData {
  participant: Participation | ParticipantManageItem | null;
  slot: EventSlotInfo | null;
  event: Event;
}

type ParticipantItem = Participation | ParticipantManageItem;

function isManageItem(p: ParticipantItem): p is ParticipantManageItem {
  return 'payment' in p && !!(p as ParticipantManageItem).user;
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
  selector: 'app-participant-slot-modal',
  imports: [
    ModalComponent,
    UserProfileCardComponent,
    ButtonComponent,
    IconComponent,
    UpperCasePipe,
    TranslocoPipe,
  ],
  templateUrl: './participant-slot-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantSlotModalComponent {
  private readonly router = inject(Router);
  protected readonly modalService = inject(ModalService);
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly userService = inject(UserService);
  private readonly moderationService = inject(ModerationService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly eventArea = inject(EventAreaService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  readonly data = input<ParticipantModalData | null>(null);

  readonly loading = signal(false);
  readonly selectedOrganizerAction = signal('');
  readonly organizerRelation = signal<OrganizerUserRelation | null | undefined>(undefined);

  constructor() {
    effect((onCleanup) => {
      const participant = this.participant();
      const userId = participant?.userId;
      const currentUserId = this.currentUserId();
      const isOrganizer = this.isOrganizer();

      if (!isOrganizer || !userId || userId === currentUserId) {
        this.organizerRelation.set(undefined);
        return;
      }

      this.organizerRelation.set(undefined);
      const request = this.moderationService.getRelation(userId).subscribe({
        next: (relation) => {
          this.organizerRelation.set(relation);
        },
        error: () => {
          this.organizerRelation.set(null);
        },
      });

      onCleanup(() => request.unsubscribe());
    });
  }

  readonly event = computed(() => this.data()?.event ?? null);
  readonly participant = computed(() => this.data()?.participant ?? null);
  readonly slot = computed(() => this.data()?.slot ?? null);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly isOrganizer = computed(() => {
    const userId = this.currentUserId();
    const e = this.event();
    return !!userId && e?.organizerId === userId;
  });

  readonly isCurrentUserParticipant = computed(() => {
    const p = this.participant();
    return !!p && p.userId === this.currentUserId();
  });

  readonly isGuestHost = computed(() => {
    const p = this.participant();
    if (!p?.isGuest) return false;
    return p.addedByUserId === this.currentUserId();
  });

  readonly isActiveStatus = computed(() => {
    const s = this.participant()?.status;
    return s === 'APPROVED' || s === 'CONFIRMED';
  });

  readonly isWithdrawnStatus = computed(() => {
    const s = this.participant()?.status;
    return s === 'WITHDRAWN' || s === 'REJECTED';
  });

  readonly isBanned = computed(
    () => (this.participant() as Participation)?.waitingReason === 'BANNED',
  );

  readonly waitingReason = computed(
    () => (this.participant() as Participation)?.waitingReason ?? null,
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
    return !s || (!s.participationId && !s.locked);
  });

  readonly slotDisplayStatus = computed<SlotDisplayStatus>(() => {
    const p = this.participant();
    if (!p) return 'free';
    const s = p.status;
    if (s === 'PENDING') return 'pending';
    if (s === 'WITHDRAWN' || s === 'REJECTED') return 'withdrawn';
    return 'participant';
  });

  readonly slotStatusConfig = computed<SlotStatusConfig>(
    () => SLOT_STATUS_CONFIG[this.slotDisplayStatus()],
  );

  readonly participationUpdatedAt = computed(() => {
    const p = this.participant();
    if (!p) return null;
    // Sprawdź różne pola daty w zależności od typu
    if ('updatedAt' in p && p.updatedAt) return formatDateTime(p.updatedAt as string);
    if ('approvedAt' in p && p.approvedAt) return formatDateTime(p.approvedAt as string);
    if ('createdAt' in p && p.createdAt) return formatDateTime(p.createdAt as string);
    return null;
  });

  readonly canJoinPublic = computed(() => {
    if (this.isCurrentUserParticipant()) return false;
    if (this.participant()) return false; // ← blokuj jeśli uczestnik istnieje
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

  readonly isPaidEvent = computed(() => (this.event()?.costPerPerson ?? 0) > 0);

  readonly trustStatus = computed(() => {
    const relation = this.organizerRelation();
    if (relation === undefined) return null;
    const isTrusted = relation?.isTrusted ?? false;
    return {
      isTrusted,
      label: isTrusted ? 'Uczestnik oznaczony jako zaufany' : 'Brak statusu zaufania',
      class: isTrusted
        ? 'border-success-200 bg-success-50 text-success-700'
        : 'border-neutral-200 bg-neutral-100 text-neutral-600',
    };
  });

  // ── Organizer action select ──

  readonly organizerActions = computed(() => {
    const p = this.participant();
    if (!p) return [];

    const status = p.status;
    const isActive = status === 'APPROVED' || status === 'CONFIRMED';
    const isWithdrawn = this.isWithdrawnStatus();
    const isBanned = this.isBanned();
    const isPaid = this.isPaidEvent();
    const payment = this.paymentInfo();
    const slotId = this.slotId();
    const slotLocked = this.slotLocked();
    const trustStatus = this.trustStatus();
    const isTrusted = trustStatus?.isTrusted ?? false;

    type Action = { value: string; label: string };

    const transitions: Action[] = [];
    if (status === 'PENDING' && !isBanned) {
      transitions.push({ value: 'approve', label: 'Zatwierdź uczestnika' });
      transitions.push({ value: 'reject', label: 'Odrzuć uczestnika' });
    }
    if (isActive) {
      transitions.push({ value: 'kick', label: 'Wypisz uczestnika' });
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
      destructive.push({ value: 'deleteParticipation', label: 'Usuń zgłoszenie' });
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
      case 'deleteParticipation':
        return this.onDeleteParticipation();
    }
  }

  // ── Organizer actions ──

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
      this.eventService.rejoinParticipation(p.id),
      'Uczestnik przywrócony',
      'Nie udało się przywrócić uczestnika',
    );
  }

  private onOrganizerChangeRole(): void {
    const p = this.participant();
    if (!p) return;
    this.modalService.close();
    this.eventArea.openChangeRoleWizardForParticipant(p as Participation);
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

  private async onDeleteParticipation(): Promise<void> {
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
      this.eventService.deleteParticipation(p.id),
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
    this.router.navigate(['/w', e.city?.slug, e.id, 'host-chat', p.userId]);
  }

  // ── Public / participant actions ──

  onJoin(): void {
    this.modalService.close();
    const roleKey = this.slot()?.roleKey ?? undefined;
    this.eventArea.openJoinWizardWithRole(roleKey);
  }

  onRejoin(): void {
    const p = this.participant() as Participation;
    if (!p) return;
    this.modalService.close();
    if (this.eventHasRoles()) {
      this.eventArea.openChangeRoleWizardForParticipant(p);
    } else {
      this.eventArea.rejoinParticipantDirect(p);
    }
  }

  onRejoinGuest(): void {
    const p = this.participant() as Participation;
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
      this.eventService.leaveParticipation(p.id),
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
    this.eventArea.openChangeRoleWizardForParticipant(p as Participation);
  }

  onContactOrganizer(): void {
    this.modalService.close();
    this.eventArea.contactOrganizer();
  }

  // ── Profile / guest update (from UserProfileCard) ──

  onProfileUpdated(data: ProfileEditData): void {
    this.loading.set(true);
    this.userService.updateProfile(data).subscribe({
      next: (updatedUser) => {
        this.profileBroadcast.notifyUserChange(updatedUser.id, {
          displayName: updatedUser.displayName,
          avatarUrl: updatedUser.avatarUrl,
        });
        this.snackbar.success('Profil zaktualizowany');
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.snackbar.error(getErrorMessage(err, 'Błąd aktualizacji profilu'));
        this.loading.set(false);
      },
    });
  }

  onGuestUpdated(data: { participationId: string; displayName: string }): void {
    this.loading.set(true);
    this.eventService.updateGuestName(data.participationId, data.displayName).subscribe({
      next: (updatedData) => {
        this.profileBroadcast.notifyGuestChange(updatedData.id, {
          displayName: updatedData.displayName,
        });
        this.snackbar.success('Nazwa gościa zaktualizowana');
        this.loading.set(false);
        this.modalService.close();
      },
      error: (err: unknown) => {
        this.snackbar.error(getErrorMessage(err, 'Błąd aktualizacji gościa'));
        this.loading.set(false);
      },
    });
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
