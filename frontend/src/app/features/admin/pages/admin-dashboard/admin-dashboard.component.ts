import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AdminService } from '../../../../core/services/admin.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, IconComponent, CardComponent, PageHeadingComponent],
  template: `
    <div class="p-4">
      <app-page-heading heading="Panel administratora" spacing="lg" />
      <div class="grid grid-cols-2 gap-4 mb-6 sm:max-w-md">
        <app-card
          ><div class="text-center">
            <app-icon name="users" size="lg" color="primary"></app-icon>
            <p class="text-2xl font-bold text-neutral-900 mt-2">
              {{ stats().users }}
            </p>
            <p class="text-xs text-neutral-500">Użytkownicy</p>
          </div></app-card
        >
        <app-card
          ><div class="text-center">
            <app-icon name="calendar" size="lg" color="primary"></app-icon>
            <p class="text-2xl font-bold text-neutral-900 mt-2">
              {{ stats().events }}
            </p>
            <p class="text-xs text-neutral-500">Wydarzenia</p>
          </div></app-card
        >
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly stats = signal({ users: 0, events: 0 });

  ngOnInit(): void {
    this.adminService
      .getUsers(1, 1)
      .subscribe((r) => this.stats.update((s) => ({ ...s, users: r.total })));
    this.adminService
      .getEvents(1, 1)
      .subscribe((r) => this.stats.update((s) => ({ ...s, events: r.total })));
  }
}
