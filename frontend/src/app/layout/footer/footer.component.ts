import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly auth = inject(AuthService);
}
