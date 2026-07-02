import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { AsideNavBarComponent } from '../../../../shared/ui/aside/aside-nav-bar.component';
import { AdminNavRailComponent } from '../../ui/admin-nav-rail/admin-nav-rail.component';
import { AdminNavService } from '../../services/admin-nav.service';

/**
 * Shell panelu admina — dwukolumnowo jak reszta paneli (main 700 + aside). Rail admina
 * rejestrowany RAZ w slocie `aside` (przeżywa nawigację między podstronami — nie miga). Aside po
 * lewej (`asideSide: 'left'` w route.data). Na mobile aside ukryty — zamiast niego globalny pasek
 * `app-aside-nav-bar` inline nad treścią (ten sam model `AdminNavService`).
 */
@Component({
  selector: 'app-admin-area',
  imports: [RouterOutlet, LayoutSlotDirective, AdminNavRailComponent, AsideNavBarComponent],
  template: `
    <ng-template appLayoutSlot="aside">
      <app-admin-nav-rail />
    </ng-template>

    <app-aside-nav-bar
      class="block border-b border-neutral-100 lg:hidden"
      ariaLabel="Nawigacja admina"
      [items]="nav.items()"
      (selected)="nav.navigate($event)"
    />

    <router-outlet />
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAreaComponent {
  readonly nav = inject(AdminNavService);
}
