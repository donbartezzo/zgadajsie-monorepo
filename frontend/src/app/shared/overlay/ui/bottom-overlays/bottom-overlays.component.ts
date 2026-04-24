import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShareOverlayComponent } from '../../../../layout/footer/overlays/share-overlay.component';
import { SettingsOverlayComponent } from '../../../../layout/footer/overlays/settings-overlay.component';
import { AuthOverlayComponent } from '../../../../features/auth/overlays/auth-overlay.component';
import { JoinRulesOverlayComponent } from '../../../../features/event/overlays/join-rules-overlay.component';
import { JoinConfirmOverlayComponent } from '../../../../features/event/overlays/join-confirm-overlay.component';
import { OrganizerActionsOverlayComponent } from '../../../../features/event/overlays/organizer-actions-overlay.component';
import { CancelPaymentOverlayComponent } from '../../../../features/organizer/overlays/cancel-payment-overlay.component';
import { EventStatusBarDetailsOverlayComponent } from '../../../../features/event/ui/event-status-bars/event-status-bar-details-overlay/event-status-bar-details-overlay.component';
import { BottomOverlaysService } from './bottom-overlays.service';

@Component({
  selector: 'app-bottom-overlays',
  imports: [
    ShareOverlayComponent,
    SettingsOverlayComponent,
    AuthOverlayComponent,
    JoinRulesOverlayComponent,
    JoinConfirmOverlayComponent,
    OrganizerActionsOverlayComponent,
    CancelPaymentOverlayComponent,
    EventStatusBarDetailsOverlayComponent,
  ],
  templateUrl: './bottom-overlays.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomOverlaysComponent {
  readonly overlays = inject(BottomOverlaysService);
}
