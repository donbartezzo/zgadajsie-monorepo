import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Event as EventModel } from '../../types';
import {
  formatEventAgeRange,
  formatEventGender,
  formatEventParticipants,
} from '../../utils/event-format.utils';
import { EventDurationPipe } from '../../pipes/event-duration.pipe';
import { EventInfoItemComponent } from '../event-info-item/event-info-item.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-event-info-grid',
  imports: [
    CommonModule,
    DatePipe,
    EventDurationPipe,
    TranslocoPipe,
    EventInfoItemComponent,
    IconComponent,
  ],
  templateUrl: './event-info-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInfoGridComponent {
  readonly event = input.required<EventModel>();
  readonly showHeader = input(true);
  readonly addressClicked = output<void>();

  readonly cityName = computed(() => this.event()?.city?.name);
  readonly ageRange = computed(() => {
    const event = this.event();
    return formatEventAgeRange(event?.ageMin, event?.ageMax);
  });
  readonly costLabel = computed(() => {
    const costPerPerson = this.event()?.costPerPerson ?? 0;
    return costPerPerson > 0 ? `${costPerPerson} zł / os.` : 'Bezpłatne';
  });
  readonly roles = computed(() => {
    const roles = this.event()?.roleConfig?.roles;
    return roles && roles.length > 1 ? roles : null;
  });
  readonly participantsLabel = computed(() => {
    const event = this.event();
    if (event.minParticipants && event.minParticipants !== event.maxParticipants) {
      return `${event.minParticipants}–${event.maxParticipants} osób`;
    }
    return formatEventParticipants(event?.maxParticipants);
  });
  readonly genderLabel = computed(() => {
    const gender = this.event()?.gender;
    return gender ? formatEventGender(gender) : null;
  });
  onAddressClick(): void {
    this.addressClicked.emit();
  }
}
