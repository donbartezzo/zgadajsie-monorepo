import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { UserService } from '../../../core/services/user.service';
import { EventService } from '../../../core/services/event.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { Event as EventModel } from '../../../shared/types';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, IconComponent, ButtonComponent, CardComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="py-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Moje wydarzenia</h1>
        <a routerLink="/events/new">
          <app-button variant="primary" size="sm">
            <app-icon name="plus" size="sm"></app-icon> Nowe
          </app-button>
        </a>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (events().length === 0) {
        <app-empty-state icon="calendar" title="Brak wydarzeń" message="Nie utworzyłeś jeszcze żadnych wydarzeń."></app-empty-state>
      } @else {
        <div class="space-y-3">
          @for (e of events(); track e.id) {
            <app-card>
              <div class="p-4">
                <div class="flex items-center justify-between mb-2">
                  <a [routerLink]="['/events', e.id]" class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600">{{ e.title }}</a>
                  <span class="text-xs px-2 py-0.5 rounded-full" [class]="e.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'">{{ e.status }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ e.startsAt | date:'d MMM yyyy, HH:mm' }}</p>
                <div class="flex gap-2">
                  <a [routerLink]="['/events', e.id, 'edit']">
                    <app-button variant="outline" size="sm"><app-icon name="edit" size="sm"></app-icon></app-button>
                  </a>
                  <app-button variant="outline" size="sm" (clicked)="onCancel(e.id)"><app-icon name="x" size="sm"></app-icon></app-button>
                  <app-button variant="outline" size="sm" (clicked)="onDuplicate(e.id)"><app-icon name="copy" size="sm"></app-icon></app-button>
                </div>
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
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);

  readonly events = signal<EventModel[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.userService.getMyEvents().subscribe({
      next: (e) => { this.events.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onCancel(id: string): void {
    this.eventService.cancelEvent(id).subscribe({
      next: () => {
        this.events.update(prev => prev.map(e => e.id === id ? { ...e, status: 'CANCELLED' } : e));
        this.snackbar.info('Wydarzenie anulowane');
      },
      error: () => this.snackbar.error('Nie udało się anulować'),
    });
  }

  onDuplicate(id: string): void {
    this.eventService.duplicateEvent(id).subscribe({
      next: (dup) => {
        this.events.update(prev => [dup, ...prev]);
        this.snackbar.success('Wydarzenie zduplikowane');
      },
      error: () => this.snackbar.error('Nie udało się zduplikować'),
    });
  }
}
