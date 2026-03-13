import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, IconComponent, ButtonComponent, CardComponent],
  template: `
    <div class="py-8">
      <app-card>
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-neutral-900">Resetuj hasło</h1>
          <p class="mt-1 text-sm text-neutral-500">Podaj email powiązany z Twoim kontem</p>
        </div>

        @if (sent()) {
        <div class="text-center">
          <div
            class="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50"
          >
            <app-icon name="mail" size="lg" variant="primary"></app-icon>
          </div>
          <p class="text-sm text-neutral-600 mb-4">
            Link do resetowania hasła został wysłany na podany adres email.
          </p>
          <a routerLink="/auth/login">
            <app-button variant="outline">Wróć do logowania</app-button>
          </a>
        </div>
        } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="twoj@email.pl"
            />
          </div>
          <app-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
            <app-icon name="send" size="sm"></app-icon>
            Wyślij link
          </app-button>
        </form>
        <div class="mt-4 text-center">
          <a routerLink="/auth/login" class="text-sm text-primary-500 hover:underline"
            >Wróć do logowania</a
          >
        </div>
        }
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  email = '';
  readonly loading = signal(false);
  readonly sent = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.email) return;
    this.loading.set(true);
    try {
      await this.auth.forgotPassword(this.email);
      this.sent.set(true);
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.snackbar.error(msg || 'Nie udało się wysłać linku');
    } finally {
      this.loading.set(false);
    }
  }
}
