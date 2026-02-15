import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { LoginFormComponent } from '../../../shared/auth/ui/login-form/login-form.component';

@Component({
  selector: 'app-auth-overlay',
  imports: [BottomOverlayComponent, LoginFormComponent],
  template: `
    <app-bottom-overlay
      [open]="true"
      title="Dołącz do wydarzenia"
      (closed)="closed.emit()"
    >
      <app-login-form (authenticated)="authenticated.emit()"></app-login-form>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthOverlayComponent {
  readonly closed = output<void>();
  readonly authenticated = output<void>();
}
