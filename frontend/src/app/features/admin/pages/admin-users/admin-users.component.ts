import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../../shared/ui/pagination/pagination.component';
import { AdminService } from '../../../../core/services/admin.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';
import { User } from '../../../../shared/types';

@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    RouterLink,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Użytkownicy" />
      <div class="mb-4">
        <input
          [(ngModel)]="search"
          (keyup.enter)="loadUsers()"
          placeholder="Szukaj..."
          class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
        />
      </div>
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
                  <th class="px-3 py-2.5 sm:px-4">Użytkownik</th>
                  <th class="px-3 py-2.5 sm:px-4">Email</th>
                  <th class="px-3 py-2.5 sm:px-4">Rola</th>
                  <th class="px-3 py-2.5 text-right sm:px-4">Akcje</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td class="px-3 py-2.5 sm:px-4">
                      <div class="flex items-center gap-2">
                        <app-user-avatar [user]="u" size="sm"></app-user-avatar>
                        <span class="font-medium text-neutral-900">{{ u.displayName }}</span>
                      </div>
                    </td>
                    <td class="px-3 py-2.5 text-neutral-600 sm:px-4">{{ u.email }}</td>
                    <td class="px-3 py-2.5 sm:px-4">
                      <span [class]="roleClass(u.role)">{{ u.role }}</span>
                    </td>
                    <td class="px-3 py-2.5 text-right sm:px-4">
                      <a
                        [routerLink]="['/admin/users', u.id]"
                        class="whitespace-nowrap text-sm font-medium text-primary-500 hover:text-primary-600"
                        >Szczegóły</a
                      >
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
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  search = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.adminService.getUsers(this.page(), 20, this.search || undefined).subscribe({
      next: (r) => {
        this.users.set(r.data);
        this.totalPages.set(Math.ceil(r.total / r.limit) || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.loadUsers();
  }

  roleClass(role: string): string {
    const base = 'inline-block rounded-full px-2 py-0.5 text-xs';
    return role === 'ADMIN'
      ? `${base} bg-danger-50 text-danger-500`
      : `${base} bg-neutral-100 text-neutral-600`;
  }
}
