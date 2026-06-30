import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
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
    CommonModule,
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
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
        <!-- Karty na mobile, tabela od md -->
        <div class="space-y-2 md:hidden">
          @for (e of events(); track e.id) {
            <app-card>
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <a
                    [routerLink]="['/w', e.city?.slug, e.id]"
                    class="block truncate text-sm font-semibold text-neutral-900 hover:text-primary-500"
                    >{{ e.title }}</a
                  >
                  <p class="text-xs text-neutral-500">
                    {{ e.startsAt | date: 'd MMM yyyy, HH:mm' }} · {{ e.status }}
                  </p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: e }" />
                </div>
              </div>
            </app-card>
          }
        </div>

        <div class="hidden overflow-hidden rounded-2xl border border-neutral-100 bg-white md:block">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500"
                >
                  <th class="px-4 py-2.5">Tytuł</th>
                  <th class="px-4 py-2.5">Termin</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                @for (e of events(); track e.id) {
                  <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td class="px-4 py-2.5">
                      <a
                        [routerLink]="['/w', e.city?.slug, e.id]"
                        class="font-medium text-neutral-900 hover:text-primary-500"
                        >{{ e.title }}</a
                      >
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-neutral-600">
                      {{ e.startsAt | date: 'd MMM yyyy, HH:mm' }}
                    </td>
                    <td class="px-4 py-2.5 text-neutral-600">{{ e.status }}</td>
                    <td class="px-4 py-2.5">
                      <div class="flex justify-end gap-1">
                        <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: e }" />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #rowActions let-e>
          <a [routerLink]="['/o', 'w', e.id, 'manage']"
            ><app-button appearance="outline" color="neutral" size="sm"
              ><app-icon name="settings" size="sm"></app-icon></app-button
          ></a>
          <a [routerLink]="['/o', 'w', e.id, 'edit']"
            ><app-button appearance="outline" color="neutral" size="sm"
              ><app-icon name="edit" size="sm"></app-icon></app-button
          ></a>
          <app-button appearance="soft" color="danger" size="sm" (clicked)="onCancel(e.id)"
            ><app-icon name="x" size="sm"></app-icon
          ></app-button>
        </ng-template>
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
