import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-event-item',
  templateUrl: './event-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventItemComponent {
  @Input() title!: string;
  @Input() date!: string;
  @Input() location!: string;
  @Input() attendeesCount!: number;
}
