import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type DateBadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-date-badge',
  imports: [CommonModule],
  template: `
    <div
      [class]="
        'overflow-hidden rounded-lg bg-white text-center ' +
        (size() === 'sm' ? 'shadow-lg min-w-10' : 'shadow-xl min-w-12')
      "
    >
      <span
        [class]="
          'block bg-primary-500 uppercase leading-tight text-white font-semibold ' +
          (size() === 'sm' ? 'px-2.5 py-px text-[9px]' : 'px-3 py-0.5 text-[10px]')
        "
        >{{ month() }}</span
      >
      <span
        [class]="
          'block font-extrabold text-neutral-900 ' +
          (size() === 'sm' ? 'text-base leading-snug' : size() === 'md' ? 'text-xl' : 'text-2xl')
        "
        >{{ day() }}</span
      >
      @if (time()) {
      <span
        [class]="
          'block font-light leading-none ' +
          (size() === 'sm'
            ? 'pb-px text-[8px] text-neutral-400'
            : size() === 'md'
            ? 'text-[9px] text-neutral-400'
            : 'text-[10px] text-neutral-400')
        "
        >godz.</span
      >
      <span
        [class]="
          'block font-medium leading-tight ' +
          (size() === 'sm'
            ? 'pb-0.5 text-[10px] text-neutral-500'
            : size() === 'md'
            ? 'text-xs text-neutral-600'
            : 'text-sm text-neutral-700')
        "
        >{{ time() }}</span
      >
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateBadgeComponent {
  month = input.required<string>();
  day = input.required<string | number>();
  time = input<string>();
  size = input<DateBadgeSize>('md');
}
