import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserProfileCardComponent } from '../../../../shared/ui/user-profile-card/user-profile-card.component';
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
    UserProfileCardComponent,
  ],
  template: `
    <div class="p-4 space-y-4">
      @if (auth.currentUser(); as user) {
      <!-- User profile card (wizytówka) -->
      <app-user-profile-card [user]="user" context="profile" variant="default">
        @if (!user.isEmailVerified) {
        <button
          (click)="resendActivation()"
          class="mt-2 text-xs text-primary-500 underline font-medium"
        >
          Wyślij link aktywacyjny ponownie
        </button>
        }
      </app-user-profile-card>

      <div class="grid grid-cols-2 gap-3">
        <a routerLink="/profile/events">
          <app-card>
            <div class="flex items-center gap-2">
              <app-icon name="calendar" size="sm" color="primary"></app-icon>
              <span class="text-sm font-medium text-neutral-700">Moje wydarzenia</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/profile/participations">
          <app-card>
            <div class="flex items-center gap-2">
              <app-icon name="users" size="sm" color="primary"></app-icon>
              <span class="text-sm font-medium text-neutral-700">Uczestnictwa</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/profile/gallery">
          <app-card>
            <div class="flex items-center gap-2">
              <app-icon name="image" size="sm" color="primary"></app-icon>
              <span class="text-sm font-medium text-neutral-700">Galeria</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/payments">
          <app-card>
            <div class="flex items-center gap-2">
              <app-icon name="credit-card" size="sm" color="primary"></app-icon>
              <span class="text-sm font-medium text-neutral-700">Moje płatności</span>
            </div>
          </app-card>
        </a>
        <a routerLink="/vouchers">
          <app-card>
            <div class="flex items-center gap-2">
              <app-icon name="wallet" size="sm" color="primary"></app-icon>
              <span class="text-sm font-medium text-neutral-700">Moje vouchery</span>
            </div>
          </app-card>
        </a>
      </div>

      <app-card>
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-neutral-900">Edytuj profil</h3>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Nazwa wyświetlana</label>
            <input
              [(ngModel)]="editName"
              class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1"
              >Nowe hasło (opcjonalne)</label
            >
            <input
              type="password"
              [(ngModel)]="newPassword"
              placeholder="Zostaw puste jeśli bez zmian"
              class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div class="flex justify-end gap-3">
            <app-button
              appearance="soft"
              color="primary"
              [loading]="saving()"
              (clicked)="saveProfile()"
            >
              <app-icon name="check" size="sm"></app-icon> Zapisz
            </app-button>
          </div>
        </div>
      </app-card>

      <div class="w-full">
        <app-button appearance="soft" color="neutral" (clicked)="logout()">
          <app-icon name="log-out" size="sm"></app-icon> Wyloguj się
        </app-button>
      </div>
      }
    </div>
  `,
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
      next: (updatedUser) => {
        // Update currentUser in AuthService to reflect changes immediately
        this.auth.updateUser(updatedUser);
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
