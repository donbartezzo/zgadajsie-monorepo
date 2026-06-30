import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LayoutSlotDirective } from '../../layouts/page-layout/layout-slot.directive';
import { AccountNavRailComponent } from './account-nav-rail.component';
import { AccountNavBarComponent } from './account-nav-bar.component';

/**
 * Jeden wrapper dla obu prezentacji nawigacji konta na stronie panelu:
 * - desktop (`lg+`): rail w kolumnie aside (przez `appLayoutSlot="aside"`),
 * - mobile (`< lg`): inline menu nad treścią strony.
 * Strona panelu dodaje po prostu `<app-account-rail-slot />` (+ `desktopLayout: 'two-column'` w route).
 */
@Component({
  selector: 'app-account-rail-slot',
  imports: [LayoutSlotDirective, AccountNavRailComponent, AccountNavBarComponent],
  template: `
    <ng-template appLayoutSlot="aside">
      <app-account-nav-rail />
    </ng-template>

    <app-account-nav-bar class="block border-b border-neutral-100 lg:hidden" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRailSlotComponent {}
