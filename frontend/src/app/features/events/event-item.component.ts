import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-event-item',
  templateUrl: './event-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventItemComponent {
  readonly title = input.required<string>();
  readonly date = input.required<string>();
  readonly location = input.required<string>();
  readonly attendeesCount = input.required<number>();
}
