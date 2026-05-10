import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../../../ui/icon/icon.component';
import { BottomOverlaysService } from '../../../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { NotificationStatusService } from '../../../../../core/services/notification-status.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { NavigationService } from '../../../../../core/services/navigation.service';

@Component({
  selector: 'app-notification-alert',
  imports: [IconComponent],
  templateUrl: './notification-alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationAlertComponent {
  private readonly overlays = inject(BottomOverlaysService);
  private readonly notifStatus = inject(NotificationStatusService);
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);

  readonly visible = computed(() => this.notifStatus.alertVisible());
  readonly state = computed(() => this.notifStatus.state());
  readonly config = computed(() => this.notifStatus.config());
  readonly loginQueryParams = computed(() => ({ returnUrl: this.navigation.router.url }));

  handleClick(): void {
    if (!this.auth.isLoggedIn()) {
      this.navigation.navigateToLogin(this.loginQueryParams().returnUrl);
      return;
    }
    this.overlays.open('notifications');
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.notifStatus.dismissAlert();
  }
}
