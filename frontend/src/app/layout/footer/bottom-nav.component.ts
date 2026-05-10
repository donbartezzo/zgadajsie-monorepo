import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { UserAvatarComponent } from '../../shared/user/ui/user-avatar/user-avatar.component';
import { AuthService } from '../../core/auth/auth.service';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-bottom-nav',
  imports: [IconComponent, UserAvatarComponent],
  templateUrl: './bottom-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed bottom-0 left-1/2 z-[60] block w-full max-w-app -translate-x-1/2' },
})
export class BottomNavComponent {
  private readonly navigation = inject(NavigationService);
  readonly auth = inject(AuthService);
  protected readonly overlays = inject(BottomOverlaysService);

  toggleShareMenu(): void {
    this.overlays.toggle('share');
  }

  toggleSettingsMenu(): void {
    this.overlays.toggle('settings');
  }

  navigateToEvents(): void {
    this.navigation.navigateToHome();
  }

  navigateToProfile(): void {
    this.navigation.navigateToProfile();
  }

  navigateToLogin(): void {
    this.navigation.navigateToLogin();
  }

  logout(): void {
    this.auth.logout();
  }
}
