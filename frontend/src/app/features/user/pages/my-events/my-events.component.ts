import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { UserService } from '../../../../core/services/user.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { Event as EventModel } from '../../../../shared/types';
import { EventStatus, EventTimeStatus } from '@zgadajsie/shared';
import {
  isEventJoinable,
  getEventTimeStatus,
} from '../../../../shared/utils/event-time-status.util';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';

@Component({
  selector: 'app-my-events',
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-neutral-900">Moje wydarzenia</h1>
        <a routerLink="/o/w/new">
          <app-button appearance="soft" color="primary" size="sm">
            <app-icon name="plus" size="sm"></app-icon> Nowe
          </app-button>
        </a>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (events().length === 0) {
        <app-empty-state
          icon="calendar"
          title="Brak wydarzeń"
          message="Nie utworzyłeś jeszcze żadnych wydarzeń."
        ></app-empty-state>
      } @else {
        <div class="space-y-3">
          @for (e of events(); track e.id) {
            <app-card>
              <div class="flex items-center justify-between mb-2">
                <a
                  [routerLink]="['/w', e.city?.slug, e.id]"
                  class="text-sm font-semibold text-neutral-900 hover:text-primary-500"
                  >{{ e.title }}</a
                >
                <span
                  [class]="
                    'text-xs px-2 py-0.5 rounded-full ' +
                    (e.status === 'CANCELLED'
                      ? 'bg-danger-50 text-danger-600'
                      : isUpcoming(e)
                        ? 'bg-success-50 text-success-600'
                        : 'bg-neutral-100 text-neutral-600')
                  "
                  >{{ getStatusLabel(e) }}</span
                >
              </div>
              <p class="text-xs text-neutral-500 mb-3">
                {{ e.startsAt | date: 'd MMM yyyy, HH:mm' }}
              </p>
              <p class="text-xs text-neutral-400 mb-3">
                Utworzone: {{ e.createdAt | date: 'd MMM yyyy, HH:mm' }}
              </p>
              <div class="flex gap-2">
                <a [routerLink]="['/o', 'w', e.id, 'manage']">
                  <app-button appearance="outline" color="neutral" size="sm"
                    ><app-icon name="settings" size="sm"></app-icon
                  ></app-button>
                </a>
                <app-button
                  appearance="outline"
                  color="neutral"
                  size="sm"
                  [disabled]="!isUpcoming(e)"
                  (clicked)="handleEdit(e)"
                  ><app-icon name="edit" size="sm"></app-icon
                ></app-button>
                <app-button
                  appearance="outline"
                  color="neutral"
                  size="sm"
                  [disabled]="e.status === 'CANCELLED'"
                  (clicked)="handleCancel(e)"
                  ><app-icon name="x" size="sm"></app-icon
                ></app-button>
                <app-button
                  appearance="soft"
                  color="danger"
                  size="sm"
                  [disabled]="!isUpcoming(e)"
                  (clicked)="handleDelete(e)"
                  ><app-icon name="trash" size="sm"></app-icon
                ></app-button>
                <app-button
                  appearance="outline"
                  color="neutral"
                  size="sm"
                  (clicked)="onDuplicate(e.id)"
                  ><app-icon name="copy" size="sm"></app-icon
                ></app-button>
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEventsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);

  readonly events = signal<EventModel[]>([]);
  readonly loading = signal(true);

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

  handleEdit(e: EventModel): void {
    if (!this.isUpcoming(e)) {
      const reason =
        e.status === EventStatus.CANCELLED
          ? 'Nie można edytować odwołanego wydarzenia.'
          : 'Edycja jest możliwa tylko przed rozpoczęciem wydarzenia.';
      this.snackbar.info(reason);
      return;
    }
    this.router.navigate(['/o', 'w', e.id, 'edit']);
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

  onDuplicate(id: string): void {
    // Przekieruj do formularza tworzenia nowego wydarzenia z ID wydarzenia do duplikacji
    this.router.navigate(['/o/w/new'], {
      queryParams: { duplicateId: id },
    });
  }

  isUpcoming(e: EventModel): boolean {
    return isEventJoinable(e.startsAt, e.status);
  }

  getStatusLabel(e: EventModel): string {
    if (e.status === EventStatus.CANCELLED) return 'ODWOŁANE';
    const timeStatus = getEventTimeStatus(e.startsAt, e.endsAt, e.status);
    if (timeStatus === EventTimeStatus.ONGOING) return 'W TRAKCIE';
    if (timeStatus === EventTimeStatus.ENDED) return 'ZAKOŃCZONE';
    return 'AKTYWNE';
  }
}
