import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_BRAND, nowInZone } from '@zgadajsie/shared';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  host: { class: 'mt-auto block' },
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly APP_BRAND = APP_BRAND;
  readonly currentYear = nowInZone().year;
  readonly appVersion = environment.version;
}
