import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { Event as EventModel } from '../../types';
import {
  formatEventGender,
  formatEventAgeRange,
  formatEventAddress,
} from '../../utils/event-format.utils';
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE } from '@zgadajsie/shared';

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
  imports: [CommonModule, DatePipe, IconComponent],
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
  readonly duration = computed(() => {
    const startsAt = this.event()?.startsAt;
    const endsAt = this.event()?.endsAt;
    if (!startsAt || !endsAt) return '';

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return '';

    const hours = Math.floor(diffMs / MILLISECONDS_PER_HOUR);
    const minutes = Math.floor((diffMs % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  });
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
