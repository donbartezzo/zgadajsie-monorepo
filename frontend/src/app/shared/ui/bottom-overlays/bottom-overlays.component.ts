import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShareOverlayComponent } from '../../../layout/footer/overlays/share-overlay.component';
import { SettingsOverlayComponent } from '../../../layout/footer/overlays/settings-overlay.component';
import { MapOverlayComponent } from '../../../features/event/overlays/map-overlay.component';
import { ParticipantsOverlayComponent } from '../../../features/event/overlays/participants-overlay.component';
import { AuthOverlayComponent } from '../../../features/auth/overlays/auth-overlay.component';
import { JoinConfirmOverlayComponent } from '../../../features/event/overlays/join-confirm-overlay.component';
import { LeaveConfirmOverlayComponent } from '../../../features/event/overlays/leave-confirm-overlay.component';
import { BottomOverlaysService } from './bottom-overlays.service';

@Component({
  selector: 'app-bottom-overlays',
  imports: [
    ShareOverlayComponent, SettingsOverlayComponent,
    MapOverlayComponent, ParticipantsOverlayComponent, AuthOverlayComponent,
    JoinConfirmOverlayComponent, LeaveConfirmOverlayComponent,
  ],
  templateUrl: './bottom-overlays.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomOverlaysComponent {
  readonly overlays = inject(BottomOverlaysService);
}
