import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { APP_BRAND } from '@zgadajsie/shared';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../shared/user/ui/user-avatar/user-avatar.component';
import { LinkListComponent, LinkListItem } from '../../shared/ui/link-list/link-list.component';
import { AuthService } from '../../core/auth/auth.service';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../core/services/navigation.service';
import { CityContextService } from '../../core/services/city-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { NavMenuService } from './nav-menu.service';

/**
 * Desktopowa nawigacja górna (od `lg`). Zastępuje mobilny bottom-nav: te same
 * akcje (miasto, udostępnij, menu użytkownika) przez współdzielone serwisy.
 */
@Component({
  selector: 'app-top-nav',
  imports: [ButtonComponent, UserAvatarComponent, LinkListComponent],
  templateUrl: './top-nav.component.html',
  host: {
    class:
      'hidden lg:block fixed top-0 inset-x-0 z-[60] h-[var(--top-nav-h)] border-b border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_2px_12px_rgba(15,23,42,0.06)]',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly navigation = inject(NavigationService);
  readonly auth = inject(AuthService);
  readonly cityContext = inject(CityContextService);
  readonly navMenu = inject(NavMenuService);
  protected readonly overlays = inject(BottomOverlaysService);
  private readonly notificationService = inject(NotificationService);

  protected readonly APP_BRAND = APP_BRAND;

  readonly menuOpen = signal(false);

  readonly unreadCount = computed(() => this.notificationService.unreadCount());
  readonly showBadge = computed(() => this.unreadCount() > 0);
  readonly badgeText = computed(() =>
    this.unreadCount() > 99 ? '99+' : this.unreadCount().toString(),
  );

  goHome(): void {
    this.navigation.navigateToHome();
  }

  goEvents(): void {
    this.navigation.navigateToCurrentCity();
  }

  goPath(path: string): void {
    this.navigation.navigateToPath([path]);
  }

  goLogin(): void {
    this.navigation.navigateToAuthLogin();
  }

  toggleShareMenu(): void {
    this.overlays.toggle('share');
  }

  toggleCityOptions(): void {
    this.overlays.toggle('cityOptions');
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  handleMenuClick(item: LinkListItem): void {
    this.navMenu.handleClick(item, () => this.menuOpen.set(false));
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
    }
  }
}
