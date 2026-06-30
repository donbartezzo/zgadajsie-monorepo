import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../../shared/ui/pagination/pagination.component';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { EventBase } from '../../../../shared/types';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';
import { EventStatus } from '@zgadajsie/shared';

@Component({
  selector: 'app-admin-events',
  imports: [
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Wydarzenia (admin)" />
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <!-- Jedna tabela responsywna: na wąskich ekranach przewija się poziomo (overflow-x-auto) -->
        <div class="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500"
                >
                  <th class="px-3 py-2.5 sm:px-4">Tytuł</th>
                  <th class="whitespace-nowrap px-3 py-2.5 sm:px-4">Termin</th>
                  <th class="px-3 py-2.5 sm:px-4">Status</th>
                  <th class="px-3 py-2.5 text-right sm:px-4">Akcje</th>
                </tr>
              </thead>
              <tbody>
                @for (e of events(); track e.id) {
                  <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td class="px-3 py-2.5 sm:px-4">
                      <a
                        [routerLink]="['/w', e.city?.slug, e.id]"
                        class="font-medium text-neutral-900 hover:text-primary-500"
                        >{{ e.title }}</a
                      >
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-neutral-600 sm:px-4">
                      {{ e.startsAt | date: 'd MMM yyyy, HH:mm' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-neutral-600 sm:px-4">
                      {{ e.status }}
                    </td>
                    <td class="px-3 py-2.5 sm:px-4">
                      <div class="flex justify-end gap-1">
                        <a [routerLink]="['/o', 'w', e.id, 'manage']"
                          ><app-button appearance="outline" color="neutral" size="sm"
                            ><app-icon name="settings" size="sm"></app-icon></app-button
                        ></a>
                        <a [routerLink]="['/o', 'w', e.id, 'edit']"
                          ><app-button appearance="outline" color="neutral" size="sm"
                            ><app-icon name="edit" size="sm"></app-icon></app-button
                        ></a>
                        <app-button
                          appearance="soft"
                          color="danger"
                          size="sm"
                          (clicked)="onCancel(e.id)"
                          ><app-icon name="x" size="sm"></app-icon
                        ></app-button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        @if (totalPages() > 1) {
          <div class="mt-4">
            <app-pagination
              [currentPage]="page()"
              [totalPages]="totalPages()"
              (pageChange)="onPageChange($event)"
            ></app-pagination>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
  readonly events = signal<EventBase[]>([]);
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
