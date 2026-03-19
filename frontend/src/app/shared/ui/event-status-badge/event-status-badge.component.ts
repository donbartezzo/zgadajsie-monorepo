import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../core/icons/icon.component';

type BadgeVariant =
  | 'ongoing'
  | 'countdown-urgent'
  | 'countdown-soon'
  | 'date'
  | 'ended'
  | 'cancelled';

@Component({
  selector: 'app-event-status-badge',
  imports: [IconComponent],
  styles: [
    `
      @keyframes soft-ping {
        0% {
          transform: scale(1);
          opacity: 0.75;
        }
        75%,
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }
      .animate-soft-ping {
        animation: soft-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
    `,
  ],
  template: `
    <div [class]="containerClass()">
      @switch (variant()) { @case ('ongoing') {
      <span class="relative flex h-2 w-2 shrink-0">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
        ></span>
        <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
      </span>
      } @case ('countdown-urgent') {
      <span class="relative flex shrink-0" style="width: 12px; height: 12px">
        <span class="absolute inset-0 flex animate-soft-ping">
          <app-icon name="clock" size="xs" class="text-white" style="display: flex" />
        </span>
        <span class="relative flex">
          <app-icon name="clock" size="xs" class="text-white" style="display: flex" />
        </span>
      </span>
      } @case ('countdown-soon') {
      <app-icon name="clock" size="xs" class="shrink-0 text-white" style="display: flex" />
      } @case ('date') {
      <app-icon name="calendar" size="xs" class="shrink-0 text-neutral-500" style="display: flex" />
      } @case ('ended') {
      <app-icon name="clock" size="xs" class="shrink-0 text-white" style="display: flex" />
      } @case ('cancelled') {
      <app-icon name="x" size="xs" class="shrink-0 text-white" style="display: flex" />
      } }
      <span [class]="textClass()">{{ label() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBadgeComponent {
  readonly variant = input.required<BadgeVariant>();
  readonly label = input.required<string>();

  readonly containerClass = computed(() => {
    const base = 'flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-lg';
    switch (this.variant()) {
      case 'ongoing':
        return `${base} bg-success-400`;
      case 'countdown-urgent':
        return `${base} bg-warning-400`;
      case 'countdown-soon':
        return `${base} bg-info-400`;
      case 'date':
        return `${base} bg-white shadow-sm`;
      case 'ended':
        return `${base} bg-neutral-400`;
      case 'cancelled':
        return `${base} bg-danger-400`;
    }
  });

  readonly textClass = computed(() => {
    const base = 'text-[10px] font-bold tracking-wide whitespace-nowrap';
    switch (this.variant()) {
      case 'ongoing':
        return `${base} text-white`;
      case 'countdown-urgent':
        return `${base} text-white`;
      case 'countdown-soon':
        return `${base} text-white`;
      case 'date':
        return `${base} text-neutral-500`;
      case 'ended':
        return `${base} text-white`;
      case 'cancelled':
        return `${base} text-white`;
    }
  });
}
