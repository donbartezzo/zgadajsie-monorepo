import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_BRAND } from '@zgadajsie/shared';
import { BottomNavComponent } from './layout/footer/bottom-nav.component';
import { SnackbarComponent } from './shared/ui/snackbar/snackbar.component';
import { BottomOverlaysComponent } from './shared/overlay/ui/bottom-overlays/bottom-overlays.component';
import { ConfirmModalComponent } from './shared/ui/confirm-modal/confirm-modal.component';
import { ModalHostComponent } from './shared/ui/modal/modal-host.component';
import { PageLayoutComponent } from './shared/layouts/page-layout/page-layout.component';
import { environment } from '../environments/environment';

@Component({
  imports: [
    RouterModule,
    BottomNavComponent,
    SnackbarComponent,
    BottomOverlaysComponent,
    ConfirmModalComponent,
    ModalHostComponent,
    PageLayoutComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = APP_BRAND.NAME;
  readonly maintenance = environment.maintenance;
  readonly contactEmail = APP_BRAND.CONTACT_EMAIL;
}
