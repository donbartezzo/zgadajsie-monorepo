import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { EventService } from '../../../../core/services/event.service';
import { OrganizerService } from '../../../../core/services/organizer.service';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { EventStatus, isOverrideAccount } from '@zgadajsie/shared';
import { Event as EventModel } from '../../../../shared/types';
import { isEventJoinable } from '../../../../shared/utils/event-time-status.util';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { EventManageCardComponent } from '../../../../shared/event/ui/event-manage-card/event-manage-card.component';
import type { ManageActionEvent } from '../../../../shared/event/ui/event-manage-card/event-manage-card.types';
import { environment } from '../../../../../environments/environment';
import { AccountContentComponent } from '../../../../shared/ui/account-nav-rail/account-content.component';

@Component({
  selector: 'app-my-events',
  imports: [
    CommonModule,
    RouterLink,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    EventManageCardComponent,
    ButtonComponent,
    IconComponent,
    CardComponent,
    AccountContentComponent,
  ],
  templateUrl: './my-events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEventsComponent implements OnInit {
  private readonly navigation = inject(NavigationService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly organizerService = inject(OrganizerService);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);

  readonly events = signal<EventModel[]>([]);
  readonly loading = signal(true);
  readonly sendingEmail = signal(false);
  readonly confirmingEventId = signal<string | null>(null);
  readonly canCreateEvents = computed(
    () =>
      environment.enableEventCreation || isOverrideAccount(this.authService.currentUser()?.email),
  );

  readonly now = signal(new Date().toISOString());

  readonly stats = computed(() => {
    const list = this.events();
    const now = this.now();
    return {
      total: list.length,
      upcoming: list.filter((e) => e.status === EventStatus.ACTIVE && e.startsAt >= now).length,
      pending: list.filter((e) => e.status === EventStatus.PENDING).length,
      ended: list.filter((e) => e.status === EventStatus.ACTIVE && e.endsAt < now).length,
      cancelled: list.filter((e) => e.status === EventStatus.CANCELLED).length,
    };
  });

  ngOnInit(): void {
    this.userService.getMyEvents().subscribe({
      next: (e) => {
        // Sortuj po dacie utworzenia (najnowsze na górze)
        const sortedEvents = e.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        this.events.set(sortedEvents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sendEmail(): void {
    this.sendingEmail.set(true);
    this.organizerService.sendDigestEmail().subscribe({
      next: () => {
        this.snackbar.success('E-mail z zestawieniem został wysłany.');
        this.sendingEmail.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się wysłać e-maila.');
        this.sendingEmail.set(false);
      },
    });
  }

  private confirmEvent(e: EventModel): void {
    if (!e.seriesId || !e.confirmToken) return;
    this.confirmingEventId.set(e.id);
    this.eventSeriesService.confirmEvent(e.seriesId, e.id).subscribe({
      next: () => {
        this.events.update((prev) =>
          prev.map((ev) =>
            ev.id === e.id ? { ...ev, status: EventStatus.ACTIVE, confirmToken: null } : ev,
          ),
        );
        this.snackbar.success('Wydarzenie potwierdzone i opublikowane.');
        this.confirmingEventId.set(null);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się potwierdzić wydarzenia.');
        this.confirmingEventId.set(null);
      },
    });
  }

  handleEdit(e: EventModel): void {
    if (!this.isUpcoming(e)) {
      const reason =
        e.status === EventStatus.CANCELLED
          ? 'Nie można edytować odwołanego wydarzenia.'
          : 'Edycja jest możliwa tylko przed rozpoczęciem wydarzenia.';
      this.snackbar.info(reason);
      return;
    }
    this.navigation.navigateToEventEdit(e.id);
  }

  handleCancel(e: EventModel): void {
    if (e.status === EventStatus.CANCELLED) {
      this.snackbar.info('To wydarzenie zostało już odwołane.');
      return;
    }
    this.eventService.cancelEvent(e.id).subscribe({
      next: () => {
        this.events.update((prev) =>
          prev.map((ev) => (ev.id === e.id ? { ...ev, status: EventStatus.CANCELLED } : ev)),
        );
        this.snackbar.info('Wydarzenie anulowane');
      },
      error: () => this.snackbar.error('Nie udało się anulować'),
    });
  }

  async handleDelete(e: EventModel): Promise<void> {
    if (!this.isUpcoming(e)) {
      const reason =
        e.status === 'CANCELLED'
          ? 'Nie można usunąć odwołanego wydarzenia.'
          : 'Usunięcie jest możliwe tylko przed rozpoczęciem wydarzenia.';
      this.snackbar.info(reason);
      return;
    }

    const confirmed = await this.confirmModal.confirm({
      title: 'Usuń wydarzenie',
      message: 'Czy na pewno chcesz usunąć to wydarzenie? Ta operacja jest nieodwracalna.',
      confirmLabel: 'Usuń',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;

    this.eventService.deleteEvent(e.id).subscribe({
      next: () => {
        this.events.update((prev) => prev.filter((ev) => ev.id !== e.id));
        this.snackbar.success('Wydarzenie usunięte');
      },
      error: (err: { error?: { message?: string } }) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się usunąć'),
    });
  }

  toManageCardItem(e: EventModel) {
    return {
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      status: e.status,
      citySlug: e.citySlug,
      seriesId: e.seriesId,
      coverImage: e.coverImage,
      address: e.address,
      costPerPerson: e.costPerPerson,
      maxParticipants: e.maxParticipants,
      enrollmentCount: e._count?.enrollments,
      participantCount: e._count?.participants,
    };
  }

  getActions(e: EventModel): ManageActionEvent['type'][] {
    if (e.status === EventStatus.PENDING) {
      return ['confirm', 'manage', 'delete', 'duplicate'];
    }
    return ['manage', 'edit', 'cancel', 'delete', 'duplicate'];
  }

  getDisabledActions(e: EventModel): ManageActionEvent['type'][] {
    const disabled: ManageActionEvent['type'][] = [];
    if (!isEventJoinable(e.startsAt, e.status)) {
      disabled.push('edit', 'delete');
    }
    if (e.status === EventStatus.CANCELLED) {
      disabled.push('cancel');
    }
    if (this.confirmingEventId() !== null && this.confirmingEventId() !== e.id) {
      disabled.push('confirm');
    }
    return disabled;
  }

  onManageAction(action: ManageActionEvent, e: EventModel): void {
    switch (action.type) {
      case 'confirm':
        this.confirmEvent(e);
        break;
      case 'manage':
        this.navigation.navigateToEventManage(action.eventId);
        break;
      case 'edit':
        this.handleEdit(e);
        break;
      case 'cancel':
        this.handleCancel(e);
        break;
      case 'delete':
        void this.handleDelete(e);
        break;
      case 'duplicate':
        this.navigation.navigateToEventCreateWithDuplicate(action.eventId);
        break;
    }
  }

  isUpcoming(e: EventModel): boolean {
    return isEventJoinable(e.startsAt, e.status);
  }
}
