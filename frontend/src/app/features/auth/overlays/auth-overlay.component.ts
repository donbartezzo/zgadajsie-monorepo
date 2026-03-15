import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { LoginFormComponent } from '../../../shared/auth/ui/login-form/login-form.component';

@Component({
  selector: 'app-auth-overlay',
  imports: [BottomOverlayComponent, LoginFormComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Dołącz do wydarzenia" (closed)="closed.emit()">
      <div class="max-w-lg mx-auto">
        <app-login-form
          [returnUrl]="returnUrl"
          (authenticated)="authenticated.emit()"
        ></app-login-form>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthOverlayComponent {
  private readonly router = inject(Router);

  readonly closed = output<void>();
  readonly authenticated = output<void>();

  readonly returnUrl = this.buildReturnUrl();

  private buildReturnUrl(): string {
    const url = this.router.url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}openJoin=true`;
  }
}
