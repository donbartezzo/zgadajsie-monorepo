import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-activate',
  imports: [RouterLink, IconComponent, ButtonComponent],
  template: `
    <div class="text-center">
      @if (loading()) {
      <app-icon name="loader" size="lg" variant="primary" class="animate-spin mb-4"></app-icon>
      <p class="text-neutral-600">Aktywowanie konta...</p>
      } @else if (success()) {
      <div
        class="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50"
      >
        <app-icon name="check" size="lg" variant="primary"></app-icon>
      </div>
      <h1 class="text-xl font-bold text-neutral-900 mb-2">Konto aktywowane!</h1>
      <p class="text-sm text-neutral-500 mb-4">Możesz się teraz zalogować.</p>
      <a routerLink="/auth/login">
        <app-button variant="primary">Zaloguj się</app-button>
      </a>
      } @else {
      <div
        class="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50"
      >
        <app-icon name="x" size="lg" variant="danger"></app-icon>
      </div>
      <h1 class="text-xl font-bold text-neutral-900 mb-2">Błąd aktywacji</h1>
      <p class="text-sm text-neutral-500 mb-4">{{ errorMsg() }}</p>
      <app-button variant="outline" (clicked)="resend()">Wyślij link ponownie</app-button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly loading = signal(true);
  readonly success = signal(false);
  readonly errorMsg = signal('Link aktywacyjny jest nieprawidłowy lub wygasł.');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      return;
    }
    try {
      await this.auth.activateAccount(token);
      this.success.set(true);
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.errorMsg.set(msg || 'Link aktywacyjny jest nieprawidłowy lub wygasł.');
    } finally {
      this.loading.set(false);
    }
  }

  async resend(): Promise<void> {
    try {
      await this.auth.resendActivation();
      this.snackbar.success('Link aktywacyjny wysłany ponownie');
    } catch {
      this.snackbar.error('Nie udało się wysłać linku');
    }
  }
}
