import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../core/icons/icon.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-unverified-account-page',
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    <section
      class="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center px-5 text-center"
    >
      <div class="w-full max-w-sm">
        <div
          class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-warning-50"
        >
          <app-icon name="mail" class="text-warning-400" size="lg"></app-icon>
        </div>

        <h1 class="text-2xl font-bold text-neutral-900">Konto niezweryfikowane</h1>

        <p class="mt-2 text-sm text-neutral-500">
          Ta strona wymaga zweryfikowanego adresu e-mail. Sprawdź swoją skrzynkę pocztową lub wyślij
          link aktywacyjny ponownie.
        </p>

        <div class="mt-8 flex flex-col gap-3">
          <app-button
            variant="primary"
            size="lg"
            [loading]="sending()"
            (clicked)="resendActivation()"
          >
            <app-icon name="mail" size="sm"></app-icon>
            Wyślij link ponownie
          </app-button>

          <a routerLink="/profile">
            <app-button variant="outline" size="lg" class="w-full">
              <app-icon name="user" size="sm"></app-icon>
              Przejdź do profilu
            </app-button>
          </a>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnverifiedAccountPageComponent {
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly sending = signal(false);

  async resendActivation(): Promise<void> {
    this.sending.set(true);
    try {
      await this.auth.resendActivation();
      this.snackbar.success('Link aktywacyjny wysłany');
    } catch {
      this.snackbar.error('Nie udało się wysłać');
    } finally {
      this.sending.set(false);
    }
  }
}
