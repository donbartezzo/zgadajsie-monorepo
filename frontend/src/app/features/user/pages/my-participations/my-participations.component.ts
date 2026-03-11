import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { UserService } from '../../../../core/services/user.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { Participation } from '../../../../shared/types';

@Component({
  selector: 'app-my-participations',
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
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Moje uczestnictwa</h1>

      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else if (participations().length === 0) {
      <app-empty-state
        icon="users"
        title="Brak uczestnictw"
        message="Nie dołączyłeś jeszcze do żadnego wydarzenia."
      ></app-empty-state>
      } @else {
      <div class="space-y-3">
        @for (p of participations(); track p.id) {
        <app-card>
          <div class="p-4 flex items-center justify-between">
            <div>
              <a
                [routerLink]="['/w', p.event?.city?.slug, p.eventId]"
                class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-highlight"
              >
                {{ p.event?.title || 'Wydarzenie' }}
              </a>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ p.event?.startsAt | date : 'd MMM yyyy, HH:mm' }}
              </p>
              <span
                [class]="
                  'text-xs mt-1 inline-block px-2 py-0.5 rounded-full ' +
                  (p.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : p.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')
                "
              >
                {{ p.status }}
              </span>
            </div>
            @if (p.status === 'ACCEPTED' || p.status === 'PENDING') {
            <app-button variant="outline" size="sm" (clicked)="onLeave(p.eventId)">
              <app-icon name="user-x" size="sm"></app-icon>
            </app-button>
            }
          </div>
        </app-card>
        }
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyParticipationsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);

  readonly participations = signal<Participation[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.userService.getMyParticipations().subscribe({
      next: (p) => {
        this.participations.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onLeave(eventId: string): void {
    this.eventService.leaveEvent(eventId).subscribe({
      next: () => {
        this.participations.update((prev) => prev.filter((p) => p.eventId !== eventId));
        this.snackbar.info('Wypisano z wydarzenia');
      },
      error: () => this.snackbar.error('Nie udało się wypisać'),
    });
  }
}
