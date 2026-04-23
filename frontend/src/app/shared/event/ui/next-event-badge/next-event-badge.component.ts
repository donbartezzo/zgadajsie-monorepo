import { ChangeDetectionStrategy, Component, computed, input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EventBase } from '../../../types';
import { ButtonComponent } from '../../../ui/button/button.component';
import { DateLabelsService } from '../../../services/date-labels.service';
import { formatTime } from '@zgadajsie/shared';

interface NextEventBadgeViewModel {
  label: string;
  time: string;
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
  private readonly dateLabels = inject(DateLabelsService);
  readonly event = input<EventBase | null>(null);

  readonly viewModel = computed<NextEventBadgeViewModel | null>(() => {
    const upcomingEvent = this.event();

    if (!upcomingEvent) {
      return null;
    }

    const label = this.dateLabels.getRelativeDateLabel(upcomingEvent.startsAt);
    const time = formatTime(upcomingEvent.startsAt);

    return {
      label,
      time,
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
