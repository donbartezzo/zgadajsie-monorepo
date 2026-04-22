import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EventBase } from '../../../types';

type EventBadgesSize = 'default' | 'card';

@Component({
  selector: 'app-event-badges',
  imports: [TranslocoPipe],
  templateUrl: './event-badges.component.html',
  styleUrls: ['./event-badges.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventBadgesComponent {
  readonly event = input.required<EventBase | null>();
  readonly size = input<EventBadgesSize>('default');

  readonly getBadgeClass = () => {
    const base = 'rounded-xs font-semibold uppercase text-white';

    if (this.size() === 'card') {
      return `${base} px-1.5 py-0.5 text-[9px]`;
    }
    return `${base} px-2 py-0.5 text-[10px]`;
  };
}
