import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../shared/ui/data-table/data-table.component';
import { DataTableCellDirective } from '../../../../shared/ui/data-table/data-table-cell.directive';
import { AdminService } from '../../../../core/services/admin.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';
import { User } from '../../../../shared/types';

@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    RouterLink,
    UserAvatarComponent,
    DataTableComponent,
    DataTableCellDirective,
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
      <app-data-table
        [data]="users()"
        [columns]="columns"
        [loading]="loading()"
        [currentPage]="page()"
        [totalPages]="totalPages()"
        (pageChange)="onPageChange($event)"
      >
        <ng-template appDataTableCell="user" let-u>
          <div class="flex items-center gap-2">
            <app-user-avatar [user]="u" size="sm"></app-user-avatar>
            <span class="font-medium text-neutral-900">{{ u.displayName }}</span>
          </div>
        </ng-template>

        <ng-template appDataTableCell="role" let-u>
          <span [class]="roleClass(u.role)">{{ u.role }}</span>
        </ng-template>

        <ng-template appDataTableCell="actions" let-u>
          <a
            [routerLink]="['/admin/users', u.id]"
            class="whitespace-nowrap text-sm font-medium text-primary-500 hover:text-primary-600"
            >Szczegóły</a
          >
        </ng-template>
      </app-data-table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly columns: DataTableColumn<User>[] = [
    { key: 'user', header: 'Użytkownik' },
    { key: 'email', header: 'Email', accessor: 'email' },
    { key: 'role', header: 'Rola' },
    { key: 'actions', header: '', align: 'right' },
  ];

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
