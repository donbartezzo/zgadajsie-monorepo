import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
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
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { BottomOverlaysService } from '../../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';
import { ProfileBroadcastService } from '../../../../core/services/profile-broadcast.service';
import { Participation, ParticipantManageItem } from '../../../types';
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

  // ── Organizer action select ──

  readonly organizerActions = computed(() => {
    const actions: { value: string; label: string }[] = [];
    const p = this.participant();
    const isBanned = this.isBanned();
    const isActive = this.isActiveStatus();
    const isWithdrawn = this.isWithdrawnStatus();
    const isPaid = this.isPaidEvent();
    const payment = this.paymentInfo();
    const slotId = this.slotId();
    const slotLocked = this.slotLocked();

    if (p?.status === 'PENDING' && !isBanned) {
      actions.push({ value: 'approve', label: 'Zatwierdź uczestnika' });
      actions.push({ value: 'reject', label: 'Odrzuć uczestnika' });
    }
    if (isActive) {
      actions.push({ value: 'chat', label: 'Napisz wiadomość' });
    }
    if (isActive && isPaid && !payment && p?.status === 'APPROVED') {
      actions.push({ value: 'markPaid', label: 'Oznacz jako opłacone' });
    }
    if (payment?.status === 'COMPLETED') {
      actions.push({ value: 'cancelPayment', label: 'Anuluj płatność' });
    }
    if (slotId && !slotLocked) {
      actions.push({ value: 'lockSlot', label: 'Zablokuj slot' });
    }
    if (slotId && slotLocked) {
      actions.push({ value: 'unlockSlot', label: 'Odblokuj slot' });
    }
    if (!isWithdrawn && !isBanned) {
      actions.push({ value: 'ban', label: 'Zbanuj uczestnika' });
    }
    if (isBanned) {
      actions.push({ value: 'unban', label: 'Zdejmij bana' });
    }

    return actions;
  });

  async onOrganizerAction(value: string): Promise<void> {
    this.selectedOrganizerAction.set('');
    switch (value) {
      case 'approve':
        return this.onApprove();
      case 'reject':
        return this.onReject();
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
    }
  }

  // ── Organizer actions ──

  private onApprove(): void {
    const p = this.participant();
    if (!p) return;
    this.loading.set(true);
    this.eventService.assignSlot(p.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.success('Zatwierdzono uczestnika');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się zatwierdzić'));
      },
    });
  }

  private onReject(): void {
    const p = this.participant();
    if (!p) return;
    this.loading.set(true);
    this.eventService.releaseSlot(p.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.info('Odrzucono uczestnika');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się odrzucić'));
      },
    });
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
    this.loading.set(true);
    this.eventService.markAsPaid(e.id, p.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.success('Oznaczono jako opłacone');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się oznaczyć'));
      },
    });
  }

  private onCancelPayment(): void {
    const p = this.participant();
    if (!p || !isManageItem(p) || !p.payment) return;
    this.modalService.close();
    this.overlays.openCancelPayment(p.payment, p.user.displayName);
    this.modalService.requestRefresh();
  }

  private onLockSlot(): void {
    const slotId = this.slotId();
    if (!slotId) return;
    this.loading.set(true);
    this.eventService.lockSlot(slotId).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.success('Slot zablokowany');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się zablokować slotu'));
      },
    });
  }

  private onUnlockSlot(): void {
    const slotId = this.slotId();
    if (!slotId) return;
    this.loading.set(true);
    this.eventService.unlockSlot(slotId).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.success('Slot odblokowany');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się odblokować slotu'));
      },
    });
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
    this.loading.set(true);
    this.moderationService.banUser(p.userId, 'Ban od organizatora').subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.info('Uczestnik zbanowany');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się zbanować'));
      },
    });
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
    this.loading.set(true);
    this.moderationService.unbanUser(p.userId).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.info('Ban zdjęty');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się zdjąć bana'));
      },
    });
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
    this.loading.set(true);
    this.eventService.leaveParticipation(p.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackbar.info('Gość wypisany z wydarzenia');
        this.closeAndRefresh();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.snackbar.error(getErrorMessage(err, 'Nie udało się wypisać gościa'));
      },
    });
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

  private closeAndRefresh(): void {
    this.modalService.close();
    this.modalService.requestRefresh();
  }
}
