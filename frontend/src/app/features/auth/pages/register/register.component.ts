import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { APP_BRAND } from '@zgadajsie/shared';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="p-6 max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-neutral-900">Utwórz konto</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Dołącz do społeczności {{ APP_BRAND.SHORT_NAME }}
        </p>
      </div>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label for="displayName" class="block text-sm font-medium text-neutral-700 mb-1"
            >Nazwa wyświetlana</label
          >
          <input
            id="displayName"
            data-testid="displayName"
            type="text"
            [(ngModel)]="displayName"
            name="displayName"
            required
            class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            placeholder="Jan Kowalski"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-neutral-700 mb-1">Email</label>
          <input
            id="email"
            data-testid="email"
            type="email"
            [(ngModel)]="email"
            name="email"
            required
            class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            placeholder="twoj@email.pl"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-neutral-700 mb-1"
            >Hasło</label
          >
          <input
            id="password"
            data-testid="password"
            type="password"
            [(ngModel)]="password"
            name="password"
            required
            minlength="8"
            maxlength="60"
            class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            placeholder="Min. 8 znaków"
          />
          <p class="mt-1 text-xs text-neutral-400">
            Co najmniej 8 znaków. Możesz używać spacji i znaków specjalnych.
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-neutral-700 mb-1"
            >Potwierdź hasło</label
          >
          <input
            id="confirmPassword"
            data-testid="confirmPassword"
            type="password"
            [(ngModel)]="confirmPassword"
            name="confirmPassword"
            required
            class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            placeholder="Powtórz hasło"
          />
        </div>

        <div class="mt-4">
          <button
            data-testid="submit"
            type="submit"
            class="flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-hidden focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm gap-2 bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-300 shadow-xs hover:shadow-sm w-full"
            [disabled]="loading()"
          >
            @if (loading()) {
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            } @else {
              <app-icon name="user-plus" size="sm"></app-icon>
            }
            Utwórz konto
          </button>
        </div>
      </form>

      <div class="mt-6 text-center text-sm text-neutral-500">
        Masz już konto?
        <a routerLink="/auth/login" class="text-primary-500 font-medium hover:underline"
          >Zaloguj się</a
        >
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  protected readonly APP_BRAND = APP_BRAND;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  readonly loading = signal(false);

  async onSubmit(): Promise<void> {
    if (this.password !== this.confirmPassword) {
      this.snackbar.error('Hasła nie są identyczne');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.register(this.email, this.password, this.displayName);
      this.snackbar.success('Konto utworzone! Sprawdź email, aby aktywować konto.');
      this.router.navigateByUrl('/auth/login');
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.snackbar.error(msg || 'Błąd rejestracji');
    } finally {
      this.loading.set(false);
    }
  }
}
