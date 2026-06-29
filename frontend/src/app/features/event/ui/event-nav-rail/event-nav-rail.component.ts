import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { AsidePanelComponent } from '../../../../shared/ui/aside/aside-panel.component';
import { AsideNavComponent, AsideNavItem } from '../../../../shared/ui/aside/aside-nav.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../services/event-area.service';
import { JoinEventButtonComponent } from '../join-event-button/join-event-button.component';

type RailKey = 'details' | 'participants' | 'map' | 'chat' | 'host-chat';

/**
 * RWD-15: trwały rail nawigacyjny strefy wydarzenia (kolumna aside na desktopie).
 * CTA „Dołącz", zakładki podstron wydarzenia oraz akcje organizatora. Zbudowany na wspólnych
 * `app-aside-panel` + `app-aside-nav`, spójnie z railem panelu organizatora i kolejnymi.
 */
@Component({
  selector: 'app-event-nav-rail',
  imports: [
    AsidePanelComponent,
    AsideNavComponent,
    ButtonComponent,
    IconComponent,
    JoinEventButtonComponent,
  ],
  templateUrl: './event-nav-rail.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventNavRailComponent {
  readonly eventArea = inject(EventAreaService);
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly overlays = inject(BottomOverlaysService);

  private readonly tabs: readonly { key: RailKey; label: string; icon: IconName }[] = [
    { key: 'details', label: 'Szczegóły', icon: 'list' },
    { key: 'participants', label: 'Uczestnicy', icon: 'users' },
    { key: 'map', label: 'Mapa', icon: 'map-pin' },
    { key: 'chat', label: 'Czat grupowy', icon: 'message-circle' },
    { key: 'host-chat', label: 'Czat z organizatorem', icon: 'mail' },
  ];

  readonly canManage = computed(() => this.eventArea.isOrganizer() || this.auth.isAdmin());

  private readonly currentUrl = toSignal(
    this.navigation.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.navigation.router.url },
  );

  private readonly activeKey = computed<RailKey>(() => {
    const url = this.currentUrl().split('?')[0];
    if (url.endsWith('/participants')) return 'participants';
    if (url.endsWith('/map')) return 'map';
    if (url.includes('/host-chat')) return 'host-chat';
    if (url.endsWith('/chat')) return 'chat';
    return 'details';
  });

  readonly items = computed<AsideNavItem[]>(() => {
    const active = this.activeKey();
    return this.tabs.map((t) => ({ ...t, active: t.key === active }));
  });

  select(key: string): void {
    const eventId = this.eventArea.eventId;
    const citySlug = this.eventArea.citySlug;
    switch (key as RailKey) {
      case 'details':
        this.navigation.navigateToEventDetail(eventId, citySlug);
        break;
      case 'participants':
        this.navigation.navigateToEventParticipants(eventId, citySlug);
        break;
      case 'map':
        this.navigation.navigateToEventMap(eventId, citySlug);
        break;
      case 'chat':
        this.navigation.navigateToEventChat(eventId, citySlug);
        break;
      case 'host-chat':
        this.navigation.navigateToEventOrganizerChat(eventId, citySlug);
        break;
    }
  }

  openManage(): void {
    this.overlays.open('organizerActions');
  }
}
