import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../ui/icon/icon.component';

type BadgeVariant = 'ongoing' | 'countdown-urgent' | 'countdown-soon' | 'days';

@Component({
  selector: 'app-event-status-badge',
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-lg"
      [ngClass]="badgeClasses()"
    >
      @switch (variant()) {
        @case ('ongoing') {
          <span class="relative flex h-2 w-2 shrink-0">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
            ></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
        }
        @case ('countdown-urgent') {
          <span class="relative flex shrink-0" style="width: 12px; height: 12px">
            <span class="absolute inset-0 flex">
              <app-icon name="clock" size="xs" class="text-white" style="display: flex" />
            </span>
            <span class="relative flex">
              <app-icon name="clock" size="xs" class="text-white" style="display: flex" />
            </span>
          </span>
        }
        @case ('countdown-soon') {
          <app-icon name="clock" size="xs" class="shrink-0 text-white" style="display: flex" />
        }
        @case ('days') {
          <app-icon name="calendar" size="xs" class="shrink-0 text-white" style="display: flex" />
        }
      }
      <span class="text-[10px] font-bold tracking-wide whitespace-nowrap text-white">{{
        displayLabel()
      }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBadgeComponent {
  readonly variant = input.required<BadgeVariant>();
  readonly label = input.required<string>();
  readonly ended = input<boolean>(false);
  readonly canceled = input<boolean>(false);

  readonly badgeClasses = computed(() => {
    const countdownColor = 'bg-yellow-700/75 border-yellow-700';
    const endedColor = 'bg-neutral-500/75 border-neutral-500';
    const canceledColor = 'bg-danger-400/75 border-danger-400';

    const classesByState: Record<BadgeVariant, string> = {
      days: countdownColor, // 'bg-blue-700/75 border-blue-700',
      ongoing: 'bg-success-400/75 border-success-400',
      'countdown-urgent': countdownColor,
      'countdown-soon': countdownColor,
    };

    if (this.ended()) {
      return endedColor;
    }

    if (this.canceled()) {
      return canceledColor;
    }

    return classesByState[this.variant()];
  });

  readonly displayLabel = computed(() => {
    let baseLabel = this.label();

    if (this.canceled()) {
      baseLabel += ` • ODWOŁANE`;
    }
    return baseLabel;
  });
}
