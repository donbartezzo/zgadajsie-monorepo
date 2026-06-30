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
    DataTableComponent,
    DataTableCellDirective,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Wydarzenia (admin)" />
      <app-data-table
        [data]="events()"
        [columns]="columns"
        [loading]="loading()"
        [currentPage]="page()"
        [totalPages]="totalPages()"
        (pageChange)="onPageChange($event)"
      >
        <ng-template appDataTableCell="title" let-e>
          <a
            [routerLink]="['/w', e.city?.slug, e.id]"
            class="font-medium text-neutral-900 hover:text-primary-500"
            >{{ e.title }}</a
          >
        </ng-template>

        <ng-template appDataTableCell="date" let-e>
          <span class="whitespace-nowrap text-neutral-600">
            {{ e.startsAt | date: 'd MMM yyyy, HH:mm' }}
          </span>
        </ng-template>

        <ng-template appDataTableCell="status" let-e>
          <span class="whitespace-nowrap text-neutral-600">{{ e.status }}</span>
        </ng-template>

        <ng-template appDataTableCell="actions" let-e>
          <div class="flex justify-end gap-1">
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
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);

  readonly columns: DataTableColumn<EventBase>[] = [
    { key: 'title', header: 'Tytuł' },
    { key: 'date', header: 'Termin', nowrap: true },
    { key: 'status', header: 'Status', nowrap: true },
    { key: 'actions', header: '', align: 'right' },
  ];

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
