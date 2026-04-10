import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
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

        @if (auth.currentUser()?.isActive) {
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

            <!-- <a routerLink="/profile/gallery">
            <app-card>
              <div class="flex items-center gap-2">
                <app-icon name="image" size="sm" color="primary"></app-icon>
                <span class="text-sm font-medium text-neutral-700">Galeria</span>
              </div>
            </app-card>
          </a> -->

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
        } @else {
          <app-card class="bg-warning-50 border-warning-200">
            <div class="flex items-start gap-3">
              <app-icon name="alert-triangle" size="md" color="warning" class="mt-0.5"></app-icon>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-warning-800 mb-1">Konto niezweryfikowane</h3>
                <p class="text-xs text-warning-700 mb-3">
                  Dostęp do Twoich wydarzeń, uczestnictw, płatności i voucherów wymaga
                  zweryfikowania konta. Sprawdź swoją skrzynkę email i kliknij w link aktywacyjny.
                </p>
                <button
                  (click)="resendActivation()"
                  class="text-xs text-warning-600 underline font-medium hover:text-warning-700"
                >
                  Wyślij link aktywacyjny ponownie
                </button>
              </div>
            </div>
          </app-card>
        }

        <app-card>
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Edytuj profil</h3>
            <div>
              <label
                for="profile-display-name"
                class="block text-xs font-medium text-neutral-600 mb-1"
              >
                Nazwa wyświetlana
              </label>
              <input
                id="profile-display-name"
                [(ngModel)]="editName"
                class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label
                for="profile-new-password"
                class="block text-xs font-medium text-neutral-600 mb-1"
              >
                Nowe hasło (opcjonalne)
              </label>
              <input
                id="profile-new-password"
                type="password"
                [(ngModel)]="newPassword"
                placeholder="Zostaw puste jeśli bez zmian"
                class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
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
