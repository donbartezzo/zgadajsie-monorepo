import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../shared/ui/data-table/data-table.component';
import { DataTableCellDirective } from '../../../../shared/ui/data-table/data-table-cell.directive';
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
    DataTableComponent,
    DataTableCellDirective,
    AccountContentComponent,
  ],
  template: `
    <app-account-content>
      <app-data-table
        [data]="participations()"
        [columns]="columns"
        [loading]="loading()"
        emptyTitle="Brak uczestnictw"
        emptyMessage="Nie dołączyłeś jeszcze do żadnego wydarzenia."
        emptyIcon="users"
      >
        <ng-template appDataTableCell="event" let-p>
          <a
            [routerLink]="['/w', p.event?.city?.slug, p.event?.id]"
            class="font-medium text-neutral-900 hover:text-primary-500"
            >{{ p.event?.title || 'Wydarzenie' }}</a
          >
        </ng-template>

        <ng-template appDataTableCell="date" let-p>
          <span class="whitespace-nowrap text-neutral-500">
            {{ p.event?.startsAt | date: 'd MMM yyyy, HH:mm' }}
          </span>
        </ng-template>

        <ng-template appDataTableCell="status" let-p>
          <span [class]="statusBadgeClass(p.status)">{{ statusLabel(p.status) }}</span>
        </ng-template>

        <ng-template appDataTableCell="actions" let-p>
          @if (canLeave(p)) {
            <app-button appearance="outline" color="neutral" size="sm" (clicked)="onLeave(p.id)">
              <app-icon name="user-x" size="sm"></app-icon>
            </app-button>
          }
        </ng-template>
      </app-data-table>
    </app-account-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyParticipationsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);

  readonly columns: DataTableColumn<Participation>[] = [
    { key: 'event', header: 'Wydarzenie' },
    { key: 'date', header: 'Termin', nowrap: true },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ];

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
