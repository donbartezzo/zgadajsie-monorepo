import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EventAreaService } from '../../services/event-area.service';

@Component({
  selector: 'app-join-event-button',
  imports: [ButtonComponent, IconComponent],
  template: `
    <app-button
      appearance="solid"
      color="primary"
      [fullWidth]="true"
      [loading]="eventArea.joining()"
      (clicked)="eventArea.openJoinSheet()"
    >
      <app-icon name="user-plus" size="sm" />
      {{ eventArea.ctaLabel() }}
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinEventButtonComponent {
  readonly eventArea = inject(EventAreaService);
}
