import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../theme.service';
import { IconComponent } from '../../core/icons/icon.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule, IconComponent, UserAvatarComponent],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);
  readonly dropdownOpen = signal(false);

  toggleTheme(event: Event): void {
    event.preventDefault();
    this.theme.toggle();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  async logout(): Promise<void> {
    this.dropdownOpen.set(false);
    await this.auth.logout();
  }
}
