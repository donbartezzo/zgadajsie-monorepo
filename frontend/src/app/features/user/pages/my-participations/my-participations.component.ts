import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
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
      <h1 class="text-xl font-bold text-neutral-900 mb-4">Moje uczestnictwa</h1>

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
              <div class="flex items-center justify-between">
                <div>
                  <a
                    [routerLink]="['/w', p.event?.city?.slug, p.eventId]"
                    class="text-sm font-semibold text-neutral-900 hover:text-primary-500"
                  >
                    {{ p.event?.title || 'Wydarzenie' }}
                  </a>
                  <p class="text-xs text-neutral-500">
                    {{ p.event?.startsAt | date: 'd MMM yyyy, HH:mm' }}
                  </p>
                  <span
                    [class]="
                      'text-xs mt-1 inline-block px-2 py-0.5 rounded-full ' +
                      (p.status === 'CONFIRMED'
                        ? 'bg-success-50 text-success-600'
                        : p.status === 'APPROVED'
                          ? 'bg-info-50 text-info-600'
                          : p.status === 'PENDING'
                            ? 'bg-warning-50 text-warning-400'
                            : 'bg-neutral-100 text-neutral-600')
                    "
                  >
                    {{ statusLabel(p.status) }}
                  </span>
                </div>
                @if (
                  p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED'
                ) {
                  <app-button
                    appearance="outline"
                    color="neutral"
                    size="sm"
                    (clicked)="onLeave(p.id)"
                  >
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

  onLeave(participationId: string): void {
    this.eventService.leaveParticipation(participationId).subscribe({
      next: () => {
        this.participations.update((prev) =>
          prev.map((p) => (p.id === participationId ? { ...p, status: 'WITHDRAWN' } : p)),
        );
        this.snackbar.info('Wypisano z wydarzenia');
      },
      error: () => this.snackbar.error('Nie udało się wypisać'),
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Oczekuje',
      APPROVED: 'Zatwierdzone',
      CONFIRMED: 'Potwierdzone',
      WITHDRAWN: 'Wycofane',
      REJECTED: 'Odrzucone',
    };
    return map[status] ?? status;
  }
}
