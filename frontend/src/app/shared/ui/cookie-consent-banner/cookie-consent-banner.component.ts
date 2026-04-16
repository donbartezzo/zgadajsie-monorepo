import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-cookie-consent-banner',
  imports: [RouterLink, ButtonComponent],
  host: { class: 'fixed bottom-[75px] left-1/2 z-40 block w-full max-w-app -translate-x-1/2 px-1' },
  templateUrl: './cookie-consent-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentBannerComponent {
  private readonly consentService = inject(CookieConsentService);
  private readonly authService = inject(AuthService);

  readonly showBanner = computed(
    () => this.consentService.consentGiven() === null && !this.authService.isAdmin(),
  );

  accept(): void {
    this.consentService.accept();
  }

  reject(): void {
    this.consentService.reject();
  }
}
