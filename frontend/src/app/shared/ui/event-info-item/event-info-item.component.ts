import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';

@Component({
  selector: 'app-event-info-item',
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex items-center gap-1 py-1" [ngClass]="highlightClass()">
      @if (hasIcon()) {
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mr-1"
          [ngClass]="iconBackgroundClass()"
        >
          <app-icon [name]="icon()!" size="sm" [color]="color()!"></app-icon>
        </span>
      }

      <div class="min-w-0">
        <span class="block text-[10px] leading-tight text-neutral-400">{{ label() }}:</span>

        @if (hasValue()) {
          <strong class="block truncate text-sm font-semibold text-neutral-900">
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

  readonly hasIcon = computed(() => this.icon() !== null);

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
