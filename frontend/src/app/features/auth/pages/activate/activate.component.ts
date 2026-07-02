import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-activate',
  imports: [RouterLink, IconComponent, ButtonComponent, FormsModule, PageHeadingComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="text-center w-full max-w-sm">
        @if (loading()) {
          <app-icon name="loader" size="lg" color="primary" class="animate-spin mb-4"></app-icon>
          <p class="text-neutral-600">Aktywowanie konta...</p>
        } @else if (success()) {
          <app-page-heading
            heading="Konto aktywowane!"
            description="Możesz teraz zalogować się."
            size="xl"
            centered
            spacing="md"
          >
            <div
              slot="icon"
              class="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50"
            >
              <app-icon name="check" size="lg" color="primary"></app-icon>
            </div>
          </app-page-heading>
          <div class="flex justify-center">
            <a routerLink="/auth/login">
              <app-button appearance="solid" color="primary">Zaloguj się</app-button>
            </a>
          </div>
        } @else {
          <app-page-heading
            heading="Błąd aktywacji"
            [description]="errorMsg()"
            size="xl"
            centered
            spacing="none"
          >
            <div
              slot="icon"
              class="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50"
            >
              <app-icon name="x" size="lg" color="danger"></app-icon>
            </div>
          </app-page-heading>
          <div class="mt-4 space-y-3">
            <input
              type="email"
              [(ngModel)]="resendEmail"
              placeholder="Twój adres email"
              class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
            <app-button color="primary" [fullWidth]="true" (clicked)="resend()">
              Wyślij link ponownie
            </app-button>
          </div>
        }
      </div>
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
  resendEmail = '';

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      return;
    }
    // Pre-fill email from logged-in user if available
    const currentEmail = this.auth.currentUser()?.email;
    if (currentEmail) this.resendEmail = currentEmail;
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
    if (!this.resendEmail) {
      this.snackbar.error('Podaj adres email');
      return;
    }
    try {
      await this.auth.resendActivationToEmail(this.resendEmail);
      this.snackbar.success('Link aktywacyjny wysłany ponownie');
    } catch {
      this.snackbar.error('Nie udało się wysłać linku');
    }
  }
}
