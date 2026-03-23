import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-join-us',
  imports: [RouterLink, IconComponent],
  templateUrl: './join-us.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinUsComponent {}
