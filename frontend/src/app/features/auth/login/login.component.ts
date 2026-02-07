import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, ButtonComponent, CardComponent],
  template: `
    <div class="py-8">
      <app-card>
        <div class="p-6">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Zaloguj się</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Witaj ponownie w ZgadajSię</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasło</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Twoje hasło"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2" (click)="togglePassword()">
                  <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" size="sm" variant="muted"></app-icon>
                </button>
              </div>
            </div>

            <div class="flex justify-end">
              <a routerLink="/auth/forgot-password" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">Zapomniałeś hasła?</a>
            </div>

            <app-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
              <app-icon name="log-in" size="sm"></app-icon>
              Zaloguj się
            </app-button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Nie masz konta?
            <a routerLink="/auth/register" class="text-blue-600 dark:text-blue-400 font-medium hover:underline">Zarejestruj się</a>
          </div>
        </div>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.snackbar.success('Zalogowano pomyślnie');
      this.router.navigateByUrl('/');
    } catch (err: any) {
      this.snackbar.error(err?.error?.message || 'Błąd logowania');
    } finally {
      this.loading.set(false);
    }
  }
}
