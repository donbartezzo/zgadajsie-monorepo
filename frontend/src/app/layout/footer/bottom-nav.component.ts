import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../theme.service';
import { BottomOverlaysService } from '../../shared/ui/bottom-overlays/bottom-overlays.service';

@Component({
  selector: 'app-bottom-nav',
  imports: [IconComponent, UserAvatarComponent],
  templateUrl: './bottom-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed bottom-0 left-1/2 z-[60] block w-full max-w-app -translate-x-1/2' },
})
export class BottomNavComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  protected readonly overlays = inject(BottomOverlaysService);

  toggleShareMenu(): void {
    this.overlays.toggle('share');
  }

  toggleSettingsMenu(): void {
    this.overlays.toggle('settings');
  }

  navigateToEvents(): void {
    this.router.navigate(['/events']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  toggleTheme(event: Event): void {
    event.preventDefault();
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
  }
}
