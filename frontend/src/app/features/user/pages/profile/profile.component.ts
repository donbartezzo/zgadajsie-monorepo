import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    UserAvatarComponent,
  ],
  template: `
    <div class="p-4 space-y-4">
      @if (auth.currentUser(); as user) {
      <div class="text-center">
        <app-user-avatar
          [avatarUrl]="user.avatarUrl"
          [displayName]="user.displayName"
          size="lg"
        ></app-user-avatar>
        <h1 class="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">
          {{ user.displayName }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ user.email }}</p>
        @if (!user.isEmailVerified) {
        <div
          class="mt-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300"
        >
          Email nie zweryfikowany.
          <button (click)="resendActivation()" class="underline font-medium ml-1">
            Wyślij link ponownie
          </button>
        </div>
        }
      </div>

      <div class="grid grid-cols-2 gap-3">
        <a routerLink="/profile/events">
          <app-card>
            <div class="p-3 flex items-center gap-2">
              <app-icon name="calendar" size="sm" variant="primary"></app-icon>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Moje wydarzenia</span
              >
            </div>
          </app-card>
        </a>
        <a routerLink="/profile/participations">
          <app-card>
            <div class="p-3 flex items-center gap-2">
              <app-icon name="users" size="sm" variant="primary"></app-icon>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Uczestnictwa</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/profile/gallery">
          <app-card>
            <div class="p-3 flex items-center gap-2">
              <app-icon name="image" size="sm" variant="primary"></app-icon>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Galeria</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/payments">
          <app-card>
            <div class="p-3 flex items-center gap-2">
              <app-icon name="credit-card" size="sm" variant="primary"></app-icon>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Moje płatności</span
              >
            </div>
          </app-card>
        </a>
        <a routerLink="/vouchers">
          <app-card>
            <div class="p-3 flex items-center gap-2">
              <app-icon name="wallet" size="sm" variant="primary"></app-icon>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Moje vouchery</span
              >
            </div>
          </app-card>
        </a>
      </div>

      <app-card>
        <div class="p-4 space-y-4">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Edytuj profil</h3>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Nazwa wyświetlana</label
            >
            <input
              [(ngModel)]="editName"
              class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Nowe hasło (opcjonalne)</label
            >
            <input
              type="password"
              [(ngModel)]="newPassword"
              placeholder="Zostaw puste jeśli bez zmian"
              class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>
          <div class="flex justify-end gap-3">
            <app-button variant="primary" [loading]="saving()" (clicked)="saveProfile()">
              <app-icon name="check" size="sm"></app-icon> Zapisz
            </app-button>
          </div>
        </div>
      </app-card>

      <div class="w-full">
        <app-button variant="secondary" (clicked)="logout()">
          <app-icon name="log-out" size="sm"></app-icon> Wyloguj się
        </app-button>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);

  editName = '';
  newPassword = '';
  readonly saving = signal(false);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) this.editName = user.displayName;
  }

  async resendActivation(): Promise<void> {
    try {
      await this.auth.resendActivation();
      this.snackbar.success('Link aktywacyjny wysłany');
    } catch {
      this.snackbar.error('Nie udało się wysłać');
    }
  }

  saveProfile(): void {
    this.saving.set(true);
    const data: { displayName: string; newPassword?: string } = { displayName: this.editName };
    if (this.newPassword) data.newPassword = this.newPassword;
    this.userService.updateProfile(data).subscribe({
      next: () => {
        this.snackbar.success('Profil zaktualizowany');
        this.saving.set(false);
        this.newPassword = '';
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Błąd zapisu');
        this.saving.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.snackbar.success('Wylogowano pomyślnie');
  }
}
