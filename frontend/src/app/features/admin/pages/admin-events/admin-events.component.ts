import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../../shared/ui/pagination/pagination.component';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { EventListItem } from '../../../../shared/types';
import { EventStatus } from '@zgadajsie/shared';

@Component({
  selector: 'app-admin-events',
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
  ],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-neutral-900 mb-4">Wydarzenia (admin)</h1>
      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else {
      <div class="space-y-2">
        @for (e of events(); track e.id) {
        <app-card>
          <div class="flex items-center justify-between">
            <div>
              <a
                [routerLink]="['/w', e.city?.slug, e.id]"
                class="text-sm font-semibold text-neutral-900 hover:text-primary-500"
                >{{ e.title }}</a
              >
              <p class="text-xs text-neutral-500">
                {{ e.startsAt | date : 'd MMM yyyy, HH:mm' }} · {{ e.status }}
              </p>
            </div>
            <div class="flex gap-1">
              <a [routerLink]="['/o', 'w', e.id, 'edit']"
                ><app-button appearance="outline" color="neutral" size="sm"
                  ><app-icon name="edit" size="sm"></app-icon></app-button
              ></a>
              <app-button appearance="soft" color="danger" size="sm" (clicked)="onCancel(e.id)"
                ><app-icon name="x" size="sm"></app-icon
              ></app-button>
            </div>
          </div>
        </app-card>
        }
      </div>
      @if (totalPages() > 1) {
      <div class="mt-4">
        <app-pagination
          [currentPage]="page()"
          [totalPages]="totalPages()"
          (pageChange)="onPageChange($event)"
        ></app-pagination>
      </div>
      } }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
  readonly events = signal<EventListItem[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.eventService.getEvents({ page: this.page(), limit: 20 }).subscribe({
      next: (r) => {
        this.events.set(r.data);
        this.totalPages.set(Math.ceil(r.total / r.limit) || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onCancel(id: string): void {
    this.eventService.cancelEvent(id).subscribe({
      next: () => {
        this.events.update((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: EventStatus.CANCELLED } : e)),
        );
        this.snackbar.info('Anulowano');
      },
      error: () => this.snackbar.error('Błąd'),
    });
  }
}
