import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { EditFakeUserOverlayComponent } from './edit-fake-user-overlay.component';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

interface FakeUser {
  id: string;
  displayName: string;
  email: string;
  avatarSeed: string | null;
  gender: string | null;
  isActive: boolean;
  createdAt: string;
  activeEnrollmentsCount: number;
}

@Component({
  selector: 'app-admin-fake-users',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    LoadingSpinnerComponent,
    UserAvatarComponent,
    BadgeComponent,
    EditFakeUserOverlayComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Fake users" spacing="lg" />

      <app-card class="mb-6">
        <div class="p-4">
          <div class="flex gap-3 items-end">
            <div class="flex-1">
              <label for="fake-user-name" class="block text-sm font-medium text-neutral-700 mb-1"
                >Nazwa</label
              >
              <input
                id="fake-user-name"
                type="text"
                [(ngModel)]="newDisplayName"
                placeholder="np. Jan Kowalski"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div class="w-32">
              <label for="fake-user-gender" class="block text-sm font-medium text-neutral-700 mb-1"
                >Płeć</label
              >
              <select
                id="fake-user-gender"
                [(ngModel)]="newGender"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-</option>
                <option value="MALE">Mężczyzna</option>
                <option value="FEMALE">Kobieta</option>
              </select>
            </div>
            <app-button (click)="createFakeUser()">Utwórz</app-button>
          </div>
        </div>
      </app-card>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <div class="space-y-3">
          @for (user of fakeUsers(); track user.id) {
            <app-card>
              <div class="relative">
                <div class="flex items-center gap-2">
                  <app-user-avatar
                    [user]="{
                      id: user.id,
                      displayName: user.displayName,
                      avatarSeed: user.avatarSeed,
                    }"
                    size="sm"
                    shape="circle"
                  />
                  <div>
                    <p
                      class="font-medium text-neutral-900 cursor-pointer hover:underline"
                      (click)="openEditOverlay(user)"
                      (keyup.enter)="openEditOverlay(user)"
                      tabindex="0"
                      role="button"
                    >
                      {{ user.displayName }}
                    </p>

                    <div class="flex items-center gap-2">
                      <app-badge variant="soft" color="neutral" size="sm">
                        {{ user.activeEnrollmentsCount }}
                      </app-badge>

                      <!-- <p class="text-xs text-neutral-500">{{ user.email }}</p> -->
                      @if (user.avatarSeed) {
                        <p class="text-xs text-neutral-400">
                          Av. seed: <strong>{{ user.avatarSeed }}</strong>
                        </p>
                      }
                    </div>
                  </div>
                </div>
                <div class="absolute bottom-2 right-0 flex items-center">
                  <button
                    (click)="toggleActive(user.id, !user.isActive)"
                    class="p-2 hover:bg-neutral-100 rounded-lg"
                    [title]="user.isActive ? 'Dezaktywuj' : 'Aktywuj'"
                  >
                    <app-icon
                      name="power"
                      size="md"
                      [color]="user.isActive ? 'success' : 'danger'"
                    />
                  </button>
                  <!-- <button
                    (click)="deleteFakeUser(user.id)"
                    class="p-2 hover:bg-danger-100 text-danger rounded-lg"
                    title="Usuń"
                  >
                    <app-icon name="trash" size="sm" />
                  </button> -->
                </div>
              </div>
            </app-card>
          }
        </div>
      }

      @if (editingUser()) {
        <app-edit-fake-user-overlay [user]="editingUser()!" (closed)="onEditClosed()" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFakeUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackbar = inject(SnackbarService);
  private readonly apiUrl = environment.apiUrl;

  readonly loading = signal(true);
  readonly fakeUsers = signal<FakeUser[]>([]);
  readonly newDisplayName = signal('');
  readonly newGender = signal('');
  readonly editingUser = signal<FakeUser | null>(null);

  ngOnInit(): void {
    this.loadFakeUsers();
  }

  loadFakeUsers(): void {
    this.loading.set(true);
    this.http.get<FakeUser[]>(`${this.apiUrl}/admin/fake-users`).subscribe({
      next: (users) => {
        this.fakeUsers.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.show('Nie udało się załadować fake users', 'error');
        this.loading.set(false);
      },
    });
  }

  createFakeUser(): void {
    if (!this.newDisplayName().trim()) {
      this.snackbar.show('Nazwa jest wymagana', 'error');
      return;
    }

    this.http
      .post<FakeUser>(`${this.apiUrl}/admin/fake-users`, {
        displayName: this.newDisplayName(),
        gender: this.newGender(),
      })
      .subscribe({
        next: (user) => {
          this.fakeUsers.update((users) => [...users, user]);
          this.newDisplayName.set('');
          this.newGender.set('');
          this.snackbar.show('Fake user utworzony', 'success');
        },
        error: () => {
          this.snackbar.show('Nie udało się utworzyć fake usera', 'error');
        },
      });
  }

  toggleActive(id: string, isActive: boolean): void {
    this.http.put<FakeUser>(`${this.apiUrl}/admin/fake-users/${id}`, { isActive }).subscribe({
      next: (updated) => {
        this.fakeUsers.update((users) => users.map((u) => (u.id === id ? updated : u)));
        this.snackbar.show('Aktywność zmieniona', 'success');
      },
      error: () => {
        this.snackbar.show('Nie udało się zmienić aktywności', 'error');
      },
    });
  }

  deleteFakeUser(id: string): void {
    if (!confirm('Czy na pewno chcesz usunąć tego fake usera?')) {
      return;
    }

    this.http.delete<void>(`${this.apiUrl}/admin/fake-users/${id}`).subscribe({
      next: () => {
        this.fakeUsers.update((users) => users.filter((u) => u.id !== id));
        this.snackbar.show('Fake user usunięty', 'success');
      },
      error: () => {
        this.snackbar.show('Nie udało się usunąć fake usera', 'error');
      },
    });
  }

  openEditOverlay(user: FakeUser): void {
    this.editingUser.set(user);
  }

  onEditClosed(): void {
    this.editingUser.set(null);
    this.loadFakeUsers();
  }
}
