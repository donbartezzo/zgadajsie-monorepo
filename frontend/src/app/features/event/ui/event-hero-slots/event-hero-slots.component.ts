import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { DateBadgeComponent } from '../../../../shared/event/ui/date-badge/date-badge.component';
import { Event as EventModel } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';

@Component({
  selector: 'app-event-hero-slots',
  imports: [LayoutSlotDirective, DateBadgeComponent],
  template: `
    @if (event(); as e) {
      <ng-template appLayoutSlot="subtitleTemplate">
        <div class="flex flex-wrap gap-1.5">
          @if (e.discipline) {
            <span
              class="rounded-sm bg-primary-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
              >{{ e.discipline.name }}</span
            >
          }
          @if (e.level) {
            <span
              class="rounded-sm bg-warning-300 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
              >{{ e.level.name }}</span
            >
          }
          @if (e.facility) {
            <span
              class="rounded-sm bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase backdrop-blur-sm"
              >{{ e.facility.name }}</span
            >
          }
        </div>
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
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase();
  });

  readonly eventDay = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).getDate().toString();
  });

  readonly eventStartTime = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  constructor() {
    effect(() => {
      const e = this.event();
      if (e?.coverImage?.filename && e?.coverImage?.disciplineSlug) {
        this.layoutConfig.coverImageUrl.set(
          coverImageUrl(e.coverImage.disciplineSlug, e.coverImage.filename),
        );
      } else {
        this.layoutConfig.coverImageUrl.set('');
      }
      this.layoutConfig.title.set(e?.title || '');
    });
    this.layoutConfig.contentClass.set('bg-white');
  }
}
