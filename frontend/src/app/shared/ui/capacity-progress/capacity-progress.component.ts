import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { getPolishPluralKey } from '../../utils/pluralization.utils';

@Component({
  selector: 'app-capacity-progress',
  host: { class: 'block' },
  templateUrl: './capacity-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapacityProgressComponent {
  private readonly transloco = inject(TranslocoService);

  readonly participantsCount = input.required<number>();
  readonly max = input.required<number>();
  readonly fillVisible = input<boolean>(true);
  readonly trackVisible = input<boolean>(true);
  readonly summaryText = input<string | undefined>(undefined);
  readonly customStatusText = input<string | undefined>(undefined);
  readonly animated = input<boolean>(false);

  readonly hasLimit = computed(() => this.max() > 0);

  readonly occupiedCount = computed(() => {
    const count = this.participantsCount();
    const max = this.max();
    if (max <= 0) return Math.max(count, 0);
    return Math.max(0, Math.min(count, max));
  });

  readonly freeCount = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.max(0, max - this.occupiedCount());
  });

  readonly occupiedPercent = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.min(100, (this.occupiedCount() / max) * 100);
  });

  readonly showBarFill = computed(() => this.fillVisible() && this.occupiedPercent() > 0);

  private buildHslColor(hue: number): string {
    return `hsl(${hue}, 65%, 85%)`;
  }

  private getProgressColor(percent: number): string {
    const normalized = Math.max(0, Math.min(100, percent));
    const hue = normalized * 1.2;
    return this.buildHslColor(hue);
  }

  readonly barStyle = computed(() => ({
    backgroundColor: this.getProgressColor(this.occupiedPercent()),
  }));

  readonly rootClass = 'w-full';
  readonly backgroundClass = computed(() =>
    this.trackVisible() ? 'bg-neutral-100/40 border border-neutral-200' : '',
  );
  readonly barClass = computed(() => {
    const stripes = this.animated() ? 'bg-striped-strong-animated' : 'bg-striped-strong';
    return `h-full rounded-full transition-all duration-300 ease-out relative ${stripes}`;
  });

  readonly statusText = computed(() => {
    const custom = this.customStatusText();
    if (custom) return custom;

    if (!this.hasLimit()) return '';

    const freeCount = this.freeCount();
    if (freeCount === 0) return this.translate('progress.full');

    return `${freeCount} ${this.translatePlural('progress.freeSeat', freeCount)}`;
  });

  private translatePlural(key: string, count: number): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`${key}.${form}`);
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
