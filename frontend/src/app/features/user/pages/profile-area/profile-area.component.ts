import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountRailSlotComponent } from '../../../../shared/ui/account-nav-rail/account-rail-slot.component';

/**
 * Parent route panelu konta (`/profile/**`) — analogicznie do `EventAreaComponent` strefy
 * wydarzenia. Rejestruje rail nawigacyjny konta RAZ w slocie aside layoutu; komponent przeżywa
 * nawigację między trasami-dziećmi, więc rail jest trwały (layoutConfig.reset() nie czyści
 * slotów) i nie „miga" przy przechodzeniu między podstronami panelu.
 *
 * Dostarcza też wspólny kontener treści kolumny głównej (`p-4 lg:p-0`), więc podstrony-dzieci
 * NIE owijają już swojej treści we własny div z paddingiem ani nie renderują `app-account-rail-slot`.
 * Uwaga: `space-y-*` celowo NIE jest tutaj — na divie owijającym `<router-outlet>` nie zadziałałby
 * (komponent renderuje się jako rodzeństwo outletu), więc odstęp pionowy zostaje po stronie dzieci.
 */
@Component({
  selector: 'app-profile-area',
  imports: [RouterOutlet, AccountRailSlotComponent],
  template: `
    <app-account-rail-slot />

    <!-- Na desktopie (2-kol) inset zapewnia box (lg:p-3) — nie dublujemy paddingu widoku -->
    <div class="p-4 lg:p-0">
      <router-outlet />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
})
export class ProfileAreaComponent {}
