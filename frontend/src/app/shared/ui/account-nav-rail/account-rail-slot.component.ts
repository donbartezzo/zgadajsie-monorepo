import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutSlotDirective } from '../../layouts/page-layout/layout-slot.directive';
import { AsideNavBarComponent } from '../aside/aside-nav-bar.component';
import { AccountNavRailComponent } from './account-nav-rail.component';
import { AccountNavService } from './account-nav.service';

/**
 * Jeden wrapper dla obu prezentacji nawigacji konta na stronie panelu:
 * - desktop (`lg+`): rail w kolumnie aside (przez `appLayoutSlot="aside"`),
 * - mobile (`< lg`): globalny pasek `app-aside-nav-bar` nad treścią strony.
 * Strona panelu dodaje po prostu `<app-account-rail-slot />` (+ `desktopLayout: 'two-column'` w route).
 */
@Component({
  selector: 'app-account-rail-slot',
  imports: [LayoutSlotDirective, AccountNavRailComponent, AsideNavBarComponent],
  template: `
    <ng-template appLayoutSlot="aside">
      <app-account-nav-rail />
    </ng-template>

    <app-aside-nav-bar
      class="block border-b border-neutral-100 lg:hidden"
      ariaLabel="Nawigacja konta"
      [items]="nav.flatItems()"
      (selected)="nav.navigate($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRailSlotComponent {
  readonly nav = inject(AccountNavService);
}
