import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_BRAND } from '@zgadajsie/shared';
import { BottomNavComponent } from './layout/footer/bottom-nav.component';
import { TopNavComponent } from './layout/nav/top-nav.component';
import { SnackbarComponent } from './shared/ui/snackbar/snackbar.component';
import { BottomOverlaysComponent } from './shared/overlay/ui/bottom-overlays/bottom-overlays.component';
import { ConfirmModalComponent } from './shared/ui/confirm-modal/confirm-modal.component';
import { ModalHostComponent } from './shared/ui/modal/modal-host.component';
import { PageLayoutComponent } from './shared/layouts/page-layout/page-layout.component';
import { CookieConsentBannerComponent } from './shared/ui/cookie-consent-banner/cookie-consent-banner.component';
import { IconComponent } from './shared/ui/icon/icon.component';
import { ExplainerComponent } from './shared/ui/explainer/explainer.component';
import { ClarityService } from './core/services/clarity.service';
import { LayoutConfigService } from './shared/layouts/page-layout/layout-config.service';
import { environment } from '../environments/environment';

@Component({
  imports: [
    RouterModule,
    BottomNavComponent,
    TopNavComponent,
    SnackbarComponent,
    BottomOverlaysComponent,
    ConfirmModalComponent,
    ModalHostComponent,
    PageLayoutComponent,
    CookieConsentBannerComponent,
    IconComponent,
    ExplainerComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = APP_BRAND.NAME;
  readonly contactEmail = APP_BRAND.CONTACT_EMAIL;

  // RWD-15: steruje klasą `.app--two-column` (poszerza box do trybu dwukolumnowego od `lg`).
  readonly layoutConfig = inject(LayoutConfigService);

  // Inject to ensure the service is instantiated and its effect runs
  // ClarityService uses effect() in constructor to automatically load Microsoft Clarity script when consent is given
  private readonly _clarity = inject(ClarityService);

  private readonly MAINTENANCE_BYPASS_KEY = 'maintenanceBypass';

  // environment.maintenance: pusty string => wyłączony; niepusty => włączony + "hasło" furtki.
  // Admin odsłania UI ustawiając w konsoli: localStorage.setItem('maintenanceBypass', '<hasło>').
  get maintenance(): boolean {
    const password = environment.maintenance;
    if (!password) {
      return false;
    }
    return this.readBypass() !== password;
  }

  private readBypass(): string | null {
    try {
      return localStorage.getItem(this.MAINTENANCE_BYPASS_KEY);
    } catch {
      return null;
    }
  }
}
