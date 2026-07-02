import { computed, inject, Injectable } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IconName } from '../../../shared/ui/icon/icon.component';
import { AsideNavItem } from '../../../shared/ui/aside/aside-nav.component';
import { NavigationService } from '../../../core/services/navigation.service';

interface AdminNavDef {
  key: string;
  label: string;
  icon: IconName;
  path: string;
}

/**
 * Współdzielony model nawigacji panelu admina. Jeden zestaw pozycji + logika `active`/
 * `navigate` dla obu prezentacji: desktopowego `app-admin-nav-rail` (aside) oraz mobilnego paska
 * `app-aside-nav-bar` (inline). Bez duplikacji.
 */
@Injectable({ providedIn: 'root' })
export class AdminNavService {
  private readonly navigation = inject(NavigationService);

  private readonly navItems: readonly AdminNavDef[] = [
    { key: 'dashboard', label: 'Pulpit', icon: 'bar-chart', path: '/admin' },
    { key: 'users', label: 'Użytkownicy', icon: 'users', path: '/admin/users' },
    { key: 'events', label: 'Wydarzenia', icon: 'calendar', path: '/admin/events' },
    { key: 'covers', label: 'Cover images', icon: 'image', path: '/admin/cover-images' },
    { key: 'settings', label: 'Ustawienia', icon: 'settings', path: '/admin/settings' },
    { key: 'crons', label: 'Crony', icon: 'clock', path: '/admin/crons' },
    { key: 'fake-users', label: 'Fake users', icon: 'user', path: '/admin/fake-users' },
    { key: 'contact', label: 'Wiadomości', icon: 'mail', path: '/admin/contact-messages' },
    { key: 'pending-emails', label: 'Kolejka emaili', icon: 'send', path: '/admin/pending-emails' },
  ];

  private readonly currentUrl = toSignal(
    this.navigation.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.navigation.router.url },
  );

  private readonly activeKey = computed<string | null>(() => {
    const url = this.currentUrl().split('?')[0].replace(/\/$/, '');
    // Najpierw dłuższe ścieżki (np. /admin/users) przed /admin (pulpit).
    const match = this.navItems
      .filter((i) => i.path !== '/admin')
      .find((i) => url.startsWith(i.path));
    if (match) return match.key;
    if (url === '/admin') return 'dashboard';
    return null;
  });

  readonly items = computed<AsideNavItem[]>(() => {
    const active = this.activeKey();
    return this.navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      active: i.key === active,
    }));
  });

  navigate(key: string): void {
    const item = this.navItems.find((i) => i.key === key);
    if (item) {
      this.navigation.navigateToPath([item.path]);
    }
  }
}
