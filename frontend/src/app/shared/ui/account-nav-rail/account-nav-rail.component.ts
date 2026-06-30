import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsidePanelComponent } from '../aside/aside-panel.component';
import { AsideNavComponent } from '../aside/aside-nav.component';
import { AccountNavService } from './account-nav.service';

/**
 * Wspólny rail nawigacyjny konta (kolumna aside, desktop). Prezentacja modelu z
 * `AccountNavService` (sekcje Konto / Uczestnik / Organizator) na bazie `app-aside-panel` +
 * `app-aside-nav`. Mobilny odpowiednik: `app-account-nav-bar`. Widoczny tylko od `lg`.
 */
@Component({
  selector: 'app-account-nav-rail',
  imports: [AsidePanelComponent, AsideNavComponent],
  templateUrl: './account-nav-rail.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNavRailComponent {
  readonly nav = inject(AccountNavService);
}
