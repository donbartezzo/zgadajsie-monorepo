import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-unverified-account-page',
  imports: [RouterLink, ButtonComponent, IconComponent, PageHeadingComponent],
  template: `
    <div class="p-6 max-w-md mx-auto text-center">
      <app-page-heading
        heading="Konto niezweryfikowane"
        description="Ta strona wymaga zweryfikowanego adresu e-mail. Sprawdź swoją skrzynkę pocztową lub wyślij link aktywacyjny ponownie."
        size="2xl"
        centered
        spacing="none"
      >
        <div
          slot="icon"
          class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-warning-50"
        >
          <app-icon name="mail" color="warning" size="lg"></app-icon>
        </div>
      </app-page-heading>

      <div class="mt-8 flex flex-col gap-3 max-w-xs mx-auto">
        <app-button
          appearance="solid"
          color="primary"
          size="lg"
          [fullWidth]="true"
          [loading]="sending()"
          (clicked)="resendActivation()"
        >
          <app-icon name="mail" size="sm"></app-icon>
          Wyślij link ponownie
        </app-button>

        <a routerLink="/profile">
          <app-button appearance="outline" color="neutral" size="lg" [fullWidth]="true">
            <app-icon name="user" size="sm"></app-icon>
            Przejdź do profilu
          </app-button>
        </a>
      </div>
    </div>
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
