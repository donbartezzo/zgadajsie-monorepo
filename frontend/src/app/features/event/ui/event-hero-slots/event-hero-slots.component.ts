import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { DateBadgeComponent } from '../../../../shared/event/ui/date-badge/date-badge.component';
import { EventBadgesComponent } from '../../../../shared/event/ui/event-badges/event-badges.component';
import { Event as EventModel } from '../../../../shared/types';
import { getEventCoverUrl } from '../../../../shared/types/cover-image.interface';
import { formatMonthShort, getDayOfMonth, formatTime } from '@zgadajsie/shared';

@Component({
  selector: 'app-event-hero-slots',
  imports: [LayoutSlotDirective, DateBadgeComponent, EventBadgesComponent],
  template: `
    @if (event(); as e) {
      <ng-template appLayoutSlot="subtitleTemplate">
        <app-event-badges [event]="e" size="default" />
      </ng-template>

      <ng-template appLayoutSlot="stickyTemplate">
        <app-date-badge [month]="eventMonth()" [day]="eventDay()" [time]="eventStartTime()" />
      </ng-template>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventHeroSlotsComponent {
  private readonly layoutConfig = inject(LayoutConfigService);

  readonly event = input.required<EventModel | null>();

  readonly eventMonth = computed(() => {
    const e = this.event();
    if (!e) return '';
    return formatMonthShort(e.startsAt).toUpperCase();
  });

  readonly eventDay = computed(() => {
    const e = this.event();
    if (!e) return '';
    return getDayOfMonth(e.startsAt).toString();
  });

  readonly eventStartTime = computed(() => {
    const e = this.event();
    if (!e) return '';
    return formatTime(e.startsAt);
  });

  constructor() {
    effect(() => {
      const e = this.event();
      const coverUrl = e ? getEventCoverUrl(e) : null;
      this.layoutConfig.coverImageUrl.set(coverUrl || '');
      this.layoutConfig.title.set(e?.title || '');
    });
  }
}
