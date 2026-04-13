import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { APP_BRAND } from '@zgadajsie/shared';

@Component({
  selector: 'app-terms',
  imports: [CommonModule],
  templateUrl: './terms.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent {
  protected readonly APP_BRAND = APP_BRAND;
  readonly brandName = APP_BRAND.NAME;
}
