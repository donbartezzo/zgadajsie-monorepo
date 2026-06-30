import { computed, inject, Injectable } from '@angular/core';
import { LinkListItem } from '../../shared/ui/link-list/link-list.component';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../core/services/navigation.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Współdzielone źródło prawdy dla głównego menu nawigacji użytkownika.
 * Używane zarówno przez mobilny `navigation-overlay` (bottom sheet), jak i
 * desktopowy dropdown w `top-nav` — bez duplikacji logiki linków i obsługi kliknięć.
 */
@Injectable({ providedIn: 'root' })
export class NavMenuService {
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly notificationService = inject(NotificationService);

  private readonly unreadCount = computed(() => this.notificationService.unreadCount());
  private readonly badgeText = computed(() =>
    this.unreadCount() > 99 ? '99+' : this.unreadCount().toString(),
  );

  readonly links = computed<LinkListItem[]>(() => {
    const baseLinks: LinkListItem[] = [
      { label: 'Strona główna', icon: 'home', value: 'home', iconColor: 'neutral' },
      { label: 'Dołącz do nas', icon: 'users', value: '/join-us', iconColor: 'primary' },
      { label: 'Kontakt', icon: 'mail', value: '/contact', iconColor: 'warning' },
      { label: 'FAQ', icon: 'search', value: '/faq', iconColor: 'info' },
      { label: 'Polityka prywatności', icon: 'shield', value: '/privacy', iconColor: 'success' },
      { label: 'Regulamin', icon: 'edit', value: '/terms', iconColor: 'info' },
    ];

    if (this.auth.isLoggedIn()) {
      return [
        ...baseLinks,
        {
          label: 'Powiadomienia',
          icon: 'bell',
          value: '/profile/general/notifications',
          iconColor: 'primary',
          badge: this.unreadCount() > 0 ? this.badgeText() : undefined,
        },
        {
          label: 'Mój profil',
          icon: 'user',
          value: 'profile',
          appearance: 'soft',
          color: 'primary',
        },
        {
          label: 'Wyloguj się',
          icon: 'log-out',
          value: 'logout',
          appearance: 'soft',
          color: 'danger',
        },
      ];
    }

    return [
      ...baseLinks,
      {
        label: 'Zaloguj się lub zarejestruj',
        icon: 'log-in',
        value: 'login',
        appearance: 'soft',
        color: 'primary',
      },
    ];
  });

  /** Wykonuje akcję dla wybranego elementu menu i woła `close` (zamknięcie kontenera). */
  handleClick(item: LinkListItem, close: () => void): void {
    if (item.value === 'login') {
      this.navigation.navigateToAuthLogin();
      close();
    } else if (item.value === 'logout') {
      this.auth.logout();
      close();
      this.navigation.navigateToRoot();
    } else if (item.value === 'profile') {
      this.navigation.navigateToProfile();
      close();
    } else if (item.value === 'home') {
      this.navigation.navigateToHome();
      close();
    } else if (item.value && item.value.startsWith('/')) {
      this.navigation.navigateToPath([item.value]);
      close();
    }
  }
}
