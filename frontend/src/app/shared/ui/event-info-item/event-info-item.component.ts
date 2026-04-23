import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';

export type EventInfoItemSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-event-info-item',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex items-center py-1" [ngClass]="containerClass()">
      @if (hasIcon()) {
        <span
          class="flex shrink-0 items-center justify-center rounded-lg mr-1"
          [ngClass]="[iconContainerClass(), iconBackgroundClass()]"
        >
          <app-icon [name]="icon()!" size="sm" [color]="color()!"></app-icon>
        </span>
      }

      <div class="min-w-0 text-left">
        <span class="block leading-tight text-neutral-400" [ngClass]="labelClass()"
          >{{ label() }}:</span
        >

        @if (hasValue()) {
          <strong class="block truncate font-semibold text-neutral-900" [ngClass]="valueClass()">
            {{ valueText() }}
          </strong>
        } @else {
          <div class="mt-1 min-w-0">
            <ng-content />
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInfoItemComponent {
  readonly color = input<SemanticColor>('neutral');
  readonly icon = input<IconName | null>(null);
  readonly label = input.required<string>();
  readonly value = input<string | number | null | undefined>(null);
  readonly highlight = input<boolean>(false);
  readonly size = input<EventInfoItemSize>('md');

  readonly hasIcon = computed(() => this.icon() !== null);

  readonly sizeClasses = computed(() => {
    const size = this.size();
    return {
      container: {
        xs: 'gap-0.5',
        sm: 'gap-1',
        md: 'gap-1',
      }[size],
      iconContainer: {
        xs: 'h-6 w-6',
        sm: 'h-7 w-7',
        md: 'h-8 w-8',
      }[size],
      label: {
        xs: '-mb-0.5 text-[8px]',
        sm: 'text-[9px]',
        md: 'text-[10px]',
      }[size],
      value: {
        xs: 'text-[10px]',
        sm: 'text-xs',
        md: 'text-sm',
      }[size],
    };
  });

  readonly containerClass = computed(() =>
    [this.sizeClasses().container, this.highlightClass()].filter(Boolean).join(' '),
  );

  readonly iconContainerClass = computed(() => this.sizeClasses().iconContainer);

  readonly labelClass = computed(() => this.sizeClasses().label);

  readonly valueClass = computed(() => this.sizeClasses().value);

  readonly iconBackgroundClass = computed(() => {
    const color = this.color();
    return SEMANTIC_COLOR_CLASSES.surfaceStrong[color];
  });

  readonly hasValue = computed(() => {
    const value = this.value();
    return value !== null && value !== undefined && value !== '';
  });

  readonly valueText = computed(() => String(this.value() ?? ''));

  readonly highlightClass = computed(() => {
    if (!this.highlight()) return '';

    const color = this.color();
    return `border border-${color}-200 rounded-lg px-2`;
  });
}
