import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../shared/types';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardComponent, UserAvatarComponent, LoadingSpinnerComponent, PaginationComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Użytkownicy</h1>
      <div class="mb-4">
        <input [(ngModel)]="search" (keyup.enter)="loadUsers()" placeholder="Szukaj..."
          class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" />
      </div>
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <div class="space-y-2">
          @for (u of users(); track u.id) {
            <a [routerLink]="['/admin/users', u.id]">
              <app-card>
                <div class="p-3 flex items-center gap-3">
                  <app-user-avatar [avatarUrl]="u.avatarUrl" [displayName]="u.displayName" size="sm"></app-user-avatar>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ u.displayName }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ u.email }}</p>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full" [class]="u.role === 'ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'">{{ u.role }}</span>
                </div>
              </app-card>
            </a>
          }
        </div>
        @if (totalPages() > 1) {
          <div class="mt-4">
            <app-pagination [currentPage]="page()" [totalPages]="totalPages()" (pageChange)="onPageChange($event)"></app-pagination>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  search = '';

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.loading.set(true);
    this.adminService.getUsers(this.page(), 20, this.search || undefined).subscribe({
      next: (r) => { this.users.set(r.data); this.totalPages.set(Math.ceil(r.total / r.limit) || 1); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.loadUsers(); }
}
