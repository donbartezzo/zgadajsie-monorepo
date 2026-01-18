import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
