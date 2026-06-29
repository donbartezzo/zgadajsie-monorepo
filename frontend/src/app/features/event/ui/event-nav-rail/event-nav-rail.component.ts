import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../services/event-area.service';
import { JoinEventButtonComponent } from '../join-event-button/join-event-button.component';

type RailKey = 'details' | 'participants' | 'map' | 'chat' | 'host-chat';

interface RailTab {
  key: RailKey;
  label: string;
  icon: IconName;
}

/**
 * RWD-15: trwały rail nawigacyjny strefy wydarzenia (kolumna aside na desktopie).
 * Surfacuje CTA „Dołącz", zakładki pomiędzy podstronami wydarzenia oraz akcje organizatora.
 * Widoczny tylko od `lg` (page-layout chowa aside < lg); na mobile rolę pełni treść strony.
 */
@Component({
  selector: 'app-event-nav-rail',
  imports: [ButtonComponent, IconComponent, JoinEventButtonComponent],
  templateUrl: './event-nav-rail.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventNavRailComponent {
  readonly eventArea = inject(EventAreaService);
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly overlays = inject(BottomOverlaysService);

  readonly tabs: readonly RailTab[] = [
    { key: 'details', label: 'Szczegóły', icon: 'list' },
    { key: 'participants', label: 'Uczestnicy', icon: 'users' },
    { key: 'map', label: 'Mapa', icon: 'map-pin' },
    { key: 'chat', label: 'Czat grupowy', icon: 'message-circle' },
    { key: 'host-chat', label: 'Czat z organizatorem', icon: 'mail' },
  ];

  readonly itemClass =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100';
  readonly activeItemClass =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold bg-primary-50 text-primary-700';

  readonly canManage = computed(() => this.eventArea.isOrganizer() || this.auth.isAdmin());

  private readonly currentUrl = toSignal(
    this.navigation.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.navigation.router.url },
  );

  readonly activeKey = computed<RailKey>(() => {
    const url = this.currentUrl().split('?')[0];
    if (url.endsWith('/participants')) return 'participants';
    if (url.endsWith('/map')) return 'map';
    if (url.includes('/host-chat')) return 'host-chat';
    if (url.endsWith('/chat')) return 'chat';
    return 'details';
  });

  select(key: RailKey): void {
    const eventId = this.eventArea.eventId;
    const citySlug = this.eventArea.citySlug;
    switch (key) {
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
