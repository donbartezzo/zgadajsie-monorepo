import { computed, inject, Injectable } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IconName } from '../icon/icon.component';
import { AsideNavItem } from '../aside/aside-nav.component';
import { NavigationService } from '../../../core/services/navigation.service';

export type AccountNavKey =
  | 'profile'
  | 'notifications'
  | 'participations'
  | 'media'
  | 'payments'
  | 'vouchers'
  | 'new'
  | 'events'
  | 'digest'
  | 'covers'
  | 'settings';

export interface AccountNavGroup {
  label: string;
  items: AsideNavItem[];
}

/**
 * Współdzielone źródło prawdy nawigacji konta (sekcje Konto / Uczestnik / Organizator).
 * Jeden model + logika nawigacji/`active` dla obu prezentacji: desktopowego railu w aside
 * (`app-account-nav-rail`) ORAZ mobilnego paska (`app-account-nav-bar`). Bez duplikacji.
 */
@Injectable({ providedIn: 'root' })
export class AccountNavService {
  private readonly navigation = inject(NavigationService);

  private readonly groupsDef: readonly {
    label: string;
    items: readonly { key: AccountNavKey; label: string; icon: IconName }[];
  }[] = [
    {
      label: 'Konto',
      items: [
        { key: 'profile', label: 'Profil', icon: 'user' },
        { key: 'notifications', label: 'Powiadomienia', icon: 'bell' },
      ],
    },
    {
      label: 'Uczestnik',
      items: [
        { key: 'participations', label: 'Uczestnictwa', icon: 'user-check' },
        { key: 'media', label: 'Galeria', icon: 'camera' },
        { key: 'payments', label: 'Płatności', icon: 'credit-card' },
        { key: 'vouchers', label: 'Vouchery', icon: 'wallet' },
      ],
    },
    {
      label: 'Organizator',
      items: [
        { key: 'new', label: 'Nowe wydarzenie', icon: 'calendar-plus' },
        { key: 'events', label: 'Moje wydarzenia', icon: 'calendar' },
        { key: 'digest', label: 'Zestawienie', icon: 'bar-chart' },
        { key: 'covers', label: 'Okładki', icon: 'image' },
        { key: 'settings', label: 'Ustawienia', icon: 'settings' },
      ],
    },
  ];

  private readonly currentUrl = toSignal(
    this.navigation.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.navigation.router.url },
  );

  readonly activeKey = computed<AccountNavKey | null>(() => {
    const url = this.currentUrl().split('?')[0].replace(/\/$/, '');
    if (url.startsWith('/profile/organizer/cover-images')) return 'covers';
    if (url.startsWith('/profile/organizer/digest')) return 'digest';
    if (url.startsWith('/profile/organizer/settings')) return 'settings';
    if (url.startsWith('/profile/events')) return 'events';
    if (url.startsWith('/profile/participations')) return 'participations';
    if (url.startsWith('/profile/media')) return 'media';
    if (url.startsWith('/notifications')) return 'notifications';
    if (url.startsWith('/payments')) return 'payments';
    if (url.startsWith('/vouchers')) return 'vouchers';
    if (url.startsWith('/o/w/new')) return 'new';
    if (url === '/profile') return 'profile';
    return null;
  });

  readonly groups = computed<AccountNavGroup[]>(() => {
    const active = this.activeKey();
    return this.groupsDef.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ ...item, active: item.key === active })),
    }));
  });

  navigate(key: string): void {
    switch (key as AccountNavKey) {
      case 'profile':
        this.navigation.navigateToProfile();
        break;
      case 'notifications':
        this.navigation.navigateToNotifications();
        break;
      case 'participations':
        this.navigation.navigateToParticipations();
        break;
      case 'media':
        this.navigation.navigateToMedia();
        break;
      case 'payments':
        this.navigation.navigateToPayments();
        break;
      case 'vouchers':
        this.navigation.navigateToVouchers();
        break;
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
