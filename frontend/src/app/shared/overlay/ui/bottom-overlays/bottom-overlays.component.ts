import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShareOverlayComponent } from '../../../../layout/footer/overlays/share-overlay.component';
import { NavigationOverlayComponent } from '../../../../layout/footer/overlays/navigation-overlay.component';
import { CityOptionsOverlayComponent } from '../../../../layout/footer/overlays/city-options-overlay.component';
import { AuthOverlayComponent } from '../../../../features/auth/overlays/auth-overlay.component';
import { JoinRulesOverlayComponent } from '../../../../features/event/overlays/join-rules-overlay.component';
import { MyParticipationDetailsOverlayComponent } from '../../../../features/event/overlays/my-participation-details-overlay.component';
import { OrganizerActionsOverlayComponent } from '../../../../features/event/overlays/organizer-actions-overlay.component';
import { CancelPaymentOverlayComponent } from '../../../../features/organizer/overlays/cancel-payment-overlay.component';
import { EventStatusBarDetailsOverlayComponent } from '../../../../features/event/ui/event-status-bars/event-status-bar-details-overlay/event-status-bar-details-overlay.component';
import { BottomOverlaysService } from './bottom-overlays.service';

@Component({
  selector: 'app-bottom-overlays',
  imports: [
    ShareOverlayComponent,
    NavigationOverlayComponent,
    CityOptionsOverlayComponent,
    AuthOverlayComponent,
    JoinRulesOverlayComponent,
    MyParticipationDetailsOverlayComponent,
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
