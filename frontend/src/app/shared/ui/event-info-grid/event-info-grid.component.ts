import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '../icon/icon.component';
import { Event as EventModel } from '../../types';
import {
  formatEventGender,
  formatEventAgeRange,
  formatEventAddress,
} from '../../utils/event-format.utils';
import { EventDurationPipe } from '../../pipes/event-duration.pipe';

export type EventInfoFieldKey =
  | 'date'
  | 'time'
  | 'duration'
  | 'location'
  | 'cost'
  | 'maxParticipants'
  | 'gender'
  | 'age'
  | 'enrollment'
  | 'city'
  | 'roles';

@Component({
  selector: 'app-event-info-grid',
  imports: [CommonModule, IconComponent, DatePipe, EventDurationPipe, TranslocoPipe],
  templateUrl: './event-info-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInfoGridComponent {
  readonly event = input.required<EventModel>();
  readonly showHeader = input(true);
  // Konfiguracja widoczności pól: jeśli nie ustawiono – wszystkie widoczne
  readonly show = input<Partial<Record<EventInfoFieldKey, boolean>>>({});
  readonly addressClicked = output<void>();

  readonly fullAddress = computed(() => formatEventAddress(this.event()?.address));
  readonly genderLabel = computed(() => formatEventGender(this.event()?.gender));
  readonly ageRange = computed(() => {
    const e = this.event();
    return formatEventAgeRange(e?.ageMin, e?.ageMax);
  });
  readonly costLabel = computed(() => {
    const cost = this.event()?.costPerPerson ?? 0;
    return cost > 0 ? `${cost} zł` : 'Bezpłatne';
  });
  readonly enrollmentPhase = computed(() => this.event()?.enrollmentPhase ?? null);
  readonly enrollmentLabel = computed(() => {
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'Wstępne zapisy';
    if (phase === 'LOTTERY_PENDING') return 'Losowanie w toku';
    if (phase === 'OPEN_ENROLLMENT') return 'Otwarte zapisy';
    return null;
  });
  readonly roles = computed(() => {
    const rc = this.event()?.roleConfig?.roles;
    return rc && rc.length > 1 ? rc : null;
  });

  isShown(key: EventInfoFieldKey): boolean {
    const cfg = this.show();
    // domyślnie wszystko widoczne
    return cfg[key] !== false;
  }

  onAddressClick(): void {
    this.addressClicked.emit();
  }
}
