import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EventAreaService } from '../../services/event-area.service';

@Component({
  selector: 'app-leave-event-button',
  imports: [ButtonComponent, IconComponent],
  template: `
    <app-button
      appearance="outline"
      color="danger"
      [fullWidth]="true"
      [loading]="eventArea.joining()"
      (clicked)="eventArea.requestLeave()"
    >
      <app-icon name="user-x" size="sm" />
      Wypisz się z wydarzenia
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveEventButtonComponent {
  readonly eventArea = inject(EventAreaService);
}
