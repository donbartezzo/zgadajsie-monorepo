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

  readonly current = input.required<number>();
  readonly max = input.required<number>();

  readonly hasLimit = computed(() => this.max() > 0);

  readonly occupiedCount = computed(() => {
    const current = this.current();
    const max = this.max();
    if (max <= 0) return Math.max(current, 0);
    return Math.max(0, Math.min(current, max));
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

  readonly freePercent = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.max(0, 100 - this.occupiedPercent());
  });

  readonly barStyle = computed(() => {
    const percent = this.occupiedPercent();

    if (percent === 0) {
      return { backgroundColor: '#9ca3af' };
    }

    let t = percent / 100;

    // 🔥 NIELINIOWE ROZCIĄGNIĘCIE KOŃCÓWKI
    if (t > 0.7) {
      // rozciąga 70–100% → większe różnice
      t = 0.7 + (t - 0.7) * 1.6;
    }

    // Hue lekko wychodzi poza 120 (bardziej "żywa" zieleń)
    const hue = Math.min(t * 130, 130);

    // Saturation rośnie wyraźniej pod koniec
    const saturation = 75 + t * 20; // 75 → 95

    // 🔥 KLUCZ: mocniejszy spadek lightness na końcu
    let lightness;
    if (t < 0.7) {
      lightness = 55 + t * 5; // dość płasko
    } else {
      lightness = 58 - (t - 0.7) * 25; // 🔥 mocny kontrast
    }

    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    };
  });

  readonly barTextClass = 'text-[10px] font-semibold leading-none text-neutral-800'; // Ciemniejszy dla lepszej widoczności
  readonly subtitleClass = 'mt-1 text-[9px] leading-tight text-neutral-400';
  readonly rootClass = 'w-full';
  readonly trackClass = 'mt-2 h-3 overflow-hidden rounded-full bg-neutral-200/70 w-full';

  readonly barClass = computed(() => {
    return 'h-full rounded-full transition-all duration-300 ease-out';
  });

  readonly ariaValueText = computed(() => {
    if (!this.hasLimit()) {
      return `${this.occupiedCount()} uczestników`;
    }

    if (this.freeCount() === 0) {
      return this.translate('progress.full');
    }

    return `${this.occupiedCount()} z ${this.max()} miejsc`;
  });

  readonly barText = computed(() => {
    const current = this.current();
    const max = this.max();

    // Normalizuj wartości - nigdy nie mogą być undefined/null/NaN
    const normalizedCurrent =
      current === undefined || current === null || isNaN(current) ? 0 : Number(current);
    const normalizedMax = max === undefined || max === null || isNaN(max) ? 0 : Number(max);

    // Zawsze pokazuj format "current / max", nigdy samo "/"
    if (normalizedMax > 0) {
      return `${normalizedCurrent} / ${normalizedMax}`;
    }

    // Gdy brak limitu, pokaż tylko current
    return `${normalizedCurrent}`;
  });

  readonly freeText = computed(() => {
    if (!this.hasLimit()) return '';

    const freeCount = this.freeCount();
    if (freeCount === 0) return this.translate('progress.full');

    return `${this.translatePlural('progress.remainingPrefix', freeCount)} ${freeCount} ${this.translatePlural(
      'progress.freeSeat',
      freeCount,
    )}`;
  });

  private translatePlural(key: string, count: number): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`${key}.${form}`);
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
