import { ChangeDetectionStrategy, Component, computed, input, inject } from '@angular/core';
import { EventBase } from '../../../types';
import { ButtonComponent } from '../../../ui/button/button.component';
import { DateLabelsService } from '../../../services/date-labels.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { formatTime } from '@zgadajsie/shared';
import { EventInfoItemComponent } from '../../../ui/event-info-item/event-info-item.component';

interface NextEventBadgeViewModel {
  timeLabel: string;
  eventId: string;
  citySlug: string;
}

@Component({
  selector: 'app-next-event-badge',
  imports: [ButtonComponent, EventInfoItemComponent],
  templateUrl: './next-event-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextEventBadgeComponent {
  private readonly navigation = inject(NavigationService);
  private readonly dateLabels = inject(DateLabelsService);
  readonly event = input<EventBase | null>(null);

  readonly viewModel = computed<NextEventBadgeViewModel | null>(() => {
    const upcomingEvent = this.event();

    if (!upcomingEvent) {
      return null;
    }

    const label = this.dateLabels.getRelativeDateLabel(upcomingEvent.startsAt);
    const time = formatTime(upcomingEvent.startsAt);

    const timeLabel = `${label} o godz. ${time}`;

    return {
      timeLabel,
      eventId: upcomingEvent.id,
      citySlug: upcomingEvent.city?.slug ?? '',
    };
  });

  onBadgeClick(): void {
    const vm = this.viewModel();
    if (vm) {
      this.navigation.navigateToEventDetail(vm.eventId, vm.citySlug);
    }
  }
}
