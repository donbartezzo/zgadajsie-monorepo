import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, ButtonComponent, CardComponent],
  template: `
    <div class="py-8">
      <app-card>
        <div class="p-6">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Utwórz konto</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Dołącz do społeczności ZgadajSię</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa wyświetlana</label>
              <input id="displayName" type="text" [(ngModel)]="displayName" name="displayName" required
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
                placeholder="Jan Kowalski" />
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input id="email" type="email" [(ngModel)]="email" name="email" required
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
                placeholder="twoj@email.pl" />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasło</label>
              <input id="password" type="password" [(ngModel)]="password" name="password" required minlength="8"
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
                placeholder="Min. 8 znaków" />
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Potwierdź hasło</label>
              <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
                placeholder="Powtórz hasło" />
            </div>

            <app-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
              <app-icon name="user-plus" size="sm"></app-icon>
              Utwórz konto
            </app-button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Masz już konto?
            <a routerLink="/auth/login" class="text-highlight dark:text-highlight-light font-medium hover:underline">Zaloguj się</a>
          </div>
        </div>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
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
