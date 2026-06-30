import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { UserService } from '../../../../core/services/user.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { Participation } from '../../../../shared/types';
import { getEventLifecycleStatus } from '../../../../shared/utils';
import { AccountContentComponent } from '../../../../shared/ui/account-nav-rail/account-content.component';

@Component({
  selector: 'app-my-participations',
  imports: [
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    AccountContentComponent,
  ],
  template: `
    <app-account-content>
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (participations().length === 0) {
        <app-empty-state
          icon="users"
          title="Brak uczestnictw"
          message="Nie dołączyłeś jeszcze do żadnego wydarzenia."
        ></app-empty-state>
      } @else {
        <!-- Jedna tabela responsywna: na wąskich ekranach przewija się poziomo (overflow-x-auto) -->
        <div class="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500"
                >
                  <th class="px-3 py-2.5 sm:px-4">Wydarzenie</th>
                  <th class="whitespace-nowrap px-3 py-2.5 sm:px-4">Termin</th>
                  <th class="px-3 py-2.5 sm:px-4">Status</th>
                  <th class="px-3 py-2.5 text-right sm:px-4">Akcje</th>
                </tr>
              </thead>
              <tbody>
                @for (p of participations(); track p.id) {
                  <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td class="px-3 py-2.5 sm:px-4">
                      <a
                        [routerLink]="['/w', p.event?.city?.slug, p.eventId]"
                        class="font-medium text-neutral-900 hover:text-primary-500"
                        >{{ p.event?.title || 'Wydarzenie' }}</a
                      >
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-neutral-500 sm:px-4">
                      {{ p.event?.startsAt | date: 'd MMM yyyy, HH:mm' }}
                    </td>
                    <td class="px-3 py-2.5 sm:px-4">
                      <span [class]="statusBadgeClass(p.status)">{{ statusLabel(p.status) }}</span>
                    </td>
                    <td class="px-3 py-2.5 text-right sm:px-4">
                      @if (canLeave(p)) {
                        <app-button
                          appearance="outline"
                          color="neutral"
                          size="sm"
                          (clicked)="onLeave(p.id)"
                        >
                          <app-icon name="user-x" size="sm"></app-icon>
                        </app-button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </app-account-content>
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
    const participation = this.participations().find((p) => p.id === participationId);
    if (!participation || !this.canLeave(participation)) {
      this.snackbar.error('Nie można wypisać się z zakończonego wydarzenia');
      return;
    }

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

  canLeave(participation: Participation): boolean {
    const event = participation.event;
    if (!event) return false;

    const ls = getEventLifecycleStatus(event.startsAt, event.endsAt, event.status);
    if (ls === 'ENDED' || ls === 'CANCELLED') return false;

    return (
      participation.status === 'PENDING' ||
      participation.status === 'APPROVED' ||
      participation.status === 'CONFIRMED'
    );
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

  statusBadgeClass(status: string): string {
    const base = 'text-xs mt-1 inline-block px-2 py-0.5 rounded-full ';
    if (status === 'CONFIRMED') return base + 'bg-success-50 text-success-600';
    if (status === 'APPROVED') return base + 'bg-info-50 text-info-600';
    if (status === 'PENDING') return base + 'bg-warning-50 text-warning-400';
    return base + 'bg-neutral-100 text-neutral-600';
  }
}
