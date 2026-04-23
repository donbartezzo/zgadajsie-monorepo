import { ChangeDetectionStrategy, Component, computed, input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EventBase } from '../../../types';
import { ButtonComponent } from '../../../ui/button/button.component';
import {
  EventStatus,
  formatDayOfWeek,
  formatTime,
  getDaysDiffTz,
  nowInZone,
  toZonedDateTime,
} from '@zgadajsie/shared';

interface NextEventBadgeViewModel {
  caption: string;
  eventId: string;
  citySlug: string;
}

@Component({
  selector: 'app-next-event-badge',
  imports: [ButtonComponent],
  templateUrl: './next-event-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextEventBadgeComponent {
  private readonly router = inject(Router);
  readonly events = input.required<EventBase[]>();

  readonly viewModel = computed<NextEventBadgeViewModel | null>(() => {
    const now = nowInZone();
    const nowMs = now.toMillis();

    let upcomingEvent: EventBase | null = null;
    let upcomingEventStartMs = Number.POSITIVE_INFINITY;

    for (const event of this.events()) {
      if (event.status === EventStatus.CANCELLED) {
        continue;
      }

      const startMs = toZonedDateTime(event.startsAt).toMillis();
      const endMs = toZonedDateTime(event.endsAt).toMillis();

      if (endMs <= nowMs) {
        continue;
      }

      if (startMs <= nowMs) {
        continue;
      }

      if (startMs > nowMs && startMs < upcomingEventStartMs) {
        upcomingEvent = event;
        upcomingEventStartMs = startMs;
      }
    }

    if (!upcomingEvent) return null;

    const daysDiff = getDaysDiffTz(upcomingEvent.startsAt);

    let label: string;
    if (daysDiff === 0) {
      label = 'Dziś';
    } else if (daysDiff === 1) {
      label = 'Jutro';
    } else if (daysDiff === 2) {
      label = 'Pojutrze';
    } else {
      label = formatDayOfWeek(upcomingEvent.startsAt);
    }

    return {
      caption: `${label} ${formatTime(upcomingEvent.startsAt)}`,
      eventId: upcomingEvent.id,
      citySlug: upcomingEvent.city?.slug ?? '',
    };
  });

  onBadgeClick(): void {
    const vm = this.viewModel();
    if (vm) {
      this.router.navigate(['/w', vm.citySlug, vm.eventId]);
    }
  }
}
