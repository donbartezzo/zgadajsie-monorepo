import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsidePanelComponent } from '../../../../shared/ui/aside/aside-panel.component';
import { AsideNavComponent } from '../../../../shared/ui/aside/aside-nav.component';
import { AdminNavService } from '../../services/admin-nav.service';

/**
 * Rail nawigacyjny panelu admina (kolumna aside, dwukolumnowo jak reszta paneli; aside z lewej).
 * Prezentacja modelu z `AdminNavService` na `app-aside-panel` + `app-aside-nav`. Mobilny odpowiednik:
 * `app-aside-nav-bar` (karmiony tym samym modelem). Rejestrowany raz przez `AdminAreaComponent`.
 */
@Component({
  selector: 'app-admin-nav-rail',
  imports: [AsidePanelComponent, AsideNavComponent],
  template: `
    <app-aside-panel heading="Panel admina">
      <app-aside-nav [items]="nav.items()" (selected)="nav.navigate($event)" />
    </app-aside-panel>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNavRailComponent {
  readonly nav = inject(AdminNavService);
}
