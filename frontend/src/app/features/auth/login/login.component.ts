import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-slate-700"></div></div>
            <div class="relative flex justify-center text-xs"><span class="bg-white dark:bg-slate-800 px-2 text-gray-500 dark:text-gray-400">lub</span></div>
          </div>

          <div class="space-y-2">
            <a [href]="googleLoginUrl" class="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Zaloguj przez Google
            </a>
            <a [href]="facebookLoginUrl" class="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Zaloguj przez Facebook
            </a>
          </div>

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
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);

  readonly googleLoginUrl = this.auth.getSocialLoginUrl('google');
  readonly facebookLoginUrl = this.auth.getSocialLoginUrl('facebook');

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly showPassword = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['accessToken'] && params['refreshToken']) {
      this.auth.handleSocialCallback(params['accessToken'], params['refreshToken']).then(() => {
        this.snackbar.success('Zalogowano pomyślnie');
        this.router.navigateByUrl('/');
      });
    }
  }

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
