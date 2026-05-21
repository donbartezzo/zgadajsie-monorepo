import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LinkListComponent, LinkListItem } from '../../../ui/link-list/link-list.component';
import { SectionSeparatorComponent } from '../../../ui/section-separator/section-separator.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';
import { Enrollment, EnrolleeManageItem } from '../../../types';
import { Event } from '../../../types/event.interface';

@Component({
  selector: 'app-enrollment-participant-actions',
  imports: [LinkListComponent, SectionSeparatorComponent],
  templateUrl: './enrollment-participant-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentParticipantActionsComponent {
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);
  readonly eventArea = inject(EventAreaService);

  readonly participant = input.required<Enrollment | EnrolleeManageItem>();
  readonly event = input.required<Event>();

  readonly actionCompleted = output<void>();
  readonly closeRequested = output<void>();

  readonly loading = signal(false);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

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

  readonly eventHasRoles = computed(() => {
    const roles = this.event()?.roleConfig?.roles;
    return Array.isArray(roles) && roles.length > 0;
  });

  readonly needsConfirmation = computed(() => {
    const p = this.participant();
    if (!p) return false;
    if (!this.isCurrentUserParticipant() && !this.isGuestHost()) return false;
    return p.status === 'APPROVED' && p.slot?.confirmed === false;
  });

  readonly canChangeRole = computed(() => {
    const canAct = this.isCurrentUserParticipant() || this.isGuestHost();
    if (!canAct) return false;
    if (!this.eventHasRoles()) return false;
    const s = this.participant()?.status;
    return s === 'PENDING' || s === 'APPROVED' || s === 'CONFIRMED';
  });

  readonly canRejoin = computed(() => {
    if (!this.isCurrentUserParticipant()) return false;
    if (!this.isWithdrawnStatus()) return false;
    if (this.isBanned()) return false;
    return this.eventArea.canJoin();
  });

  readonly canGuestRejoin = computed(() => {
    if (!this.isGuestHost()) return false;
    if (!this.isWithdrawnStatus()) return false;
    return this.eventArea.canJoin();
  });

  readonly canLeave = computed(() => {
    const p = this.participant();
    if (!p) return false;
    const s = p.status;
    return s === 'PENDING' || s === 'APPROVED' || s === 'CONFIRMED';
  });

  readonly actionLinks = computed<LinkListItem[]>(() => {
    const links: LinkListItem[] = [];
    const isWithdrawn = this.isWithdrawnStatus();

    // Confirm slot
    if (this.needsConfirmation()) {
      links.push({
        label: 'Potwierdź uczestnictwo',
        description: 'Zatwierdź swoje miejsce na liście uczestników',
        icon: 'check-circle',
        value: 'confirm',
        appearance: 'solid',
        color: 'success',
      });
    }

    // Change role
    if (this.canChangeRole()) {
      links.push({
        label: 'Zmień rolę',
        description: 'Wybierz inną rolę w wydarzeniu',
        icon: 'edit',
        value: 'change-role',
        iconColor: 'primary',
      });
    }

    // Leave
    if (this.isCurrentUserParticipant() && !isWithdrawn && this.canLeave()) {
      links.push({
        label: 'Wypisz się z wydarzenia',
        description: 'Stracisz swoje miejsce',
        icon: 'user-x',
        value: 'leave',
        appearance: 'soft',
        color: 'danger',
      });
    }

    // Remove guest
    if (this.isGuestHost() && !isWithdrawn) {
      links.push({
        label: 'Wypisz gościa z wydarzenia',
        description: 'Usuń tę osobę z listy uczestników',
        icon: 'user-x',
        value: 'remove-guest',
        appearance: 'soft',
        color: 'danger',
      });
    }

    // Rejoin
    if (isWithdrawn && this.canRejoin()) {
      links.push({
        label: 'Wróć do wydarzenia',
        description: 'Zapisz się ponownie na wydarzenie',
        icon: 'user-plus',
        value: 'rejoin',
        appearance: 'soft',
        color: 'primary',
      });
    }

    // Rejoin guest
    if (isWithdrawn && this.canGuestRejoin()) {
      links.push({
        label: 'Dodaj gościa ponownie',
        description: 'Zapisz tę osobę ponownie jako gościa',
        icon: 'user-plus',
        value: 'rejoin-guest',
        appearance: 'soft',
        color: 'primary',
      });
    }

    return links;
  });

  async handleActionClick(item: LinkListItem): Promise<void> {
    switch (item.value) {
      case 'confirm':
        await this.onConfirmSlot();
        break;
      case 'change-role':
        await this.onChangeRole();
        break;
      case 'leave':
        await this.onLeave();
        break;
      case 'remove-guest':
        await this.onRemoveGuest();
        break;
      case 'rejoin':
        this.onRejoin();
        break;
      case 'rejoin-guest':
        this.onRejoinGuest();
        break;
    }
  }

  async onConfirmSlot(): Promise<void> {
    const p = this.participant();
    if (!p) return;
    this.loading.set(true);
    try {
      await firstValueFrom(this.eventService.confirmSlot(p.id));
      this.snackbar.success('Uczestnictwo potwierdzone!');
      this.loading.set(false);
      this.actionCompleted.emit();
    } catch (err: unknown) {
      const errorMsg =
        typeof err === 'object' &&
        err !== null &&
        'error' in err &&
        typeof err.error === 'object' &&
        err.error !== null &&
        'message' in err.error
          ? (err.error as { message: string }).message
          : 'Nie udało się potwierdzić uczestnictwa';
      this.snackbar.error(errorMsg);
      this.loading.set(false);
    }
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
    this.closeRequested.emit();
    this.eventArea.openChangeRoleWizardForParticipant(p as Enrollment);
  }

  async onLeave(): Promise<void> {
    this.closeRequested.emit();
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
    try {
      await firstValueFrom(this.eventService.leaveEnrollment(p.id));
      this.snackbar.info('Gość wypisany z wydarzenia');
      this.loading.set(false);
      this.actionCompleted.emit();
    } catch (err: unknown) {
      const errorMsg =
        typeof err === 'object' &&
        err !== null &&
        'error' in err &&
        typeof err.error === 'object' &&
        err.error !== null &&
        'message' in err.error
          ? (err.error as { message: string }).message
          : 'Nie udało się wypisać gościa';
      this.snackbar.error(errorMsg);
      this.loading.set(false);
    }
  }

  onRejoin(): void {
    const p = this.participant() as Enrollment;
    if (!p) return;
    this.closeRequested.emit();
    if (this.eventHasRoles()) {
      this.eventArea.openChangeRoleWizardForParticipant(p);
    } else {
      this.eventArea.rejoinParticipantDirect(p);
    }
  }

  onRejoinGuest(): void {
    const p = this.participant() as Enrollment;
    if (!p) return;
    this.closeRequested.emit();
    if (this.eventHasRoles()) {
      this.eventArea.openChangeRoleWizardForParticipant(p);
    } else {
      this.eventArea.rejoinParticipantDirect(p);
    }
  }
}
