import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IconName } from '../../../../shared/ui/icon/icon.component';
import { AsidePanelComponent } from '../../../../shared/ui/aside/aside-panel.component';
import { AsideNavComponent, AsideNavItem } from '../../../../shared/ui/aside/aside-nav.component';
import { NavigationService } from '../../../../core/services/navigation.service';

type RailKey = 'new' | 'events' | 'digest' | 'covers' | 'settings';

/**
 * RWD-16: rail nawigacyjny panelu organizatora (kolumna aside na desktopie).
 * Globalna nawigacja po stronach panelu. Zbudowany na wspólnych `app-aside-panel` + `app-aside-nav`,
 * spójnie z railem strefy wydarzenia i kolejnymi. Widoczny tylko od `lg`.
 */
@Component({
  selector: 'app-organizer-nav-rail',
  imports: [AsidePanelComponent, AsideNavComponent],
  templateUrl: './organizer-nav-rail.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerNavRailComponent {
  private readonly navigation = inject(NavigationService);

  private readonly tabs: readonly { key: RailKey; label: string; icon: IconName }[] = [
    { key: 'new', label: 'Nowe wydarzenie', icon: 'calendar-plus' },
    { key: 'events', label: 'Moje wydarzenia', icon: 'list' },
    { key: 'digest', label: 'Zestawienie', icon: 'bar-chart' },
    { key: 'covers', label: 'Okładki', icon: 'image' },
    { key: 'settings', label: 'Ustawienia', icon: 'settings' },
  ];

  private readonly currentUrl = toSignal(
    this.navigation.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.navigation.router.url },
  );

  private readonly activeKey = computed<RailKey | null>(() => {
    const url = this.currentUrl().split('?')[0];
    if (url.startsWith('/o/w/new')) return 'new';
    if (url.startsWith('/profile/events')) return 'events';
    if (url.startsWith('/profile/organizer/digest')) return 'digest';
    if (url.startsWith('/profile/organizer/cover-images')) return 'covers';
    if (url.startsWith('/profile/organizer/settings')) return 'settings';
    return null;
  });

  readonly items = computed<AsideNavItem[]>(() => {
    const active = this.activeKey();
    return this.tabs.map((t) => ({ ...t, active: t.key === active }));
  });

  select(key: string): void {
    switch (key as RailKey) {
      case 'new':
        this.navigation.navigateToEventCreate();
        break;
      case 'events':
        this.navigation.navigateToProfileEvents();
        break;
      case 'digest':
        this.navigation.navigateToOrganizerDigest();
        break;
      case 'covers':
        this.navigation.navigateToProfileCoverImages();
        break;
      case 'settings':
        this.navigation.navigateToOrganizerSettings();
        break;
    }
  }
}
