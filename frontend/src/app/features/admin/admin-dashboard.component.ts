import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink, IconComponent, CardComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Panel administratora</h1>
      <div class="grid grid-cols-2 gap-4 mb-6">
        <app-card><div class="p-4 text-center">
          <app-icon name="users" size="lg" variant="primary"></app-icon>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{{ stats().users }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Użytkownicy</p>
        </div></app-card>
        <app-card><div class="p-4 text-center">
          <app-icon name="calendar" size="lg" variant="primary"></app-icon>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{{ stats().events }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Wydarzenia</p>
        </div></app-card>
      </div>
      <div class="space-y-3">
        <a routerLink="/admin/users"><app-card><div class="p-4 flex items-center gap-3">
          <app-icon name="users" size="sm"></app-icon>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Zarządzaj użytkownikami</span>
        </div></app-card></a>
        <a routerLink="/admin/events"><app-card><div class="p-4 flex items-center gap-3">
          <app-icon name="calendar" size="sm"></app-icon>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Zarządzaj wydarzeniami</span>
        </div></app-card></a>
        <a routerLink="/admin/settings"><app-card><div class="p-4 flex items-center gap-3">
          <app-icon name="settings" size="sm"></app-icon>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Ustawienia systemowe</span>
        </div></app-card></a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly stats = signal({ users: 0, events: 0 });

  ngOnInit(): void {
    this.adminService.getUsers(1, 1).subscribe(r => this.stats.update(s => ({ ...s, users: r.total })));
  }
}
