import { ChangeDetectionStrategy, Component, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-navigation-overlay',
  imports: [CommonModule, BottomOverlayComponent, LinkListComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Nawigacja" (closed)="closed.emit()">
      <div class="space-y-3 max-w-lg mx-auto">
        <section class="space-y-1.5">
          <app-link-list
            [items]="navigationLinks()"
            (itemClicked)="handleNavigationClick($event)"
          />
        </section>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationOverlayComponent {
  readonly auth = inject(AuthService);
  readonly navigation = inject(NavigationService);

  readonly closed = output<void>();

  readonly navigationLinks = computed<LinkListItem[]>(() => {
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

  handleNavigationClick(item: LinkListItem): void {
    if (item.value === 'login') {
      this.navigation.navigateToAuthLogin();
      this.closed.emit();
    } else if (item.value === 'logout') {
      this.auth.logout();
      this.closed.emit();
      this.navigation.navigateToRoot();
    } else if (item.value === 'profile') {
      this.navigation.navigateToProfile();
      this.closed.emit();
    } else if (item.value === 'home') {
      this.navigation.navigateToHome();
      this.closed.emit();
    } else if (item.value && item.value.startsWith('/')) {
      this.navigation.navigateToPath([item.value]);
      this.closed.emit();
    }
  }
}
