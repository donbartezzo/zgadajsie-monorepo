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

  readonly enrollmentsCount = input<number | undefined>(undefined);
  readonly participantsCount = input.required<number>();
  readonly max = input.required<number>();
  readonly isPreEnrollment = input<boolean>(false);
  readonly isJoinable = input<boolean>(false);
  readonly customStatusText = input<string | undefined>(undefined);

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

  readonly showBarFill = computed(() => !this.isPreEnrollment() && this.occupiedPercent() > 0);

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
  readonly backgroundClass = 'bg-neutral-100/40 border border-neutral-200';
  readonly barClass =
    'h-full rounded-full transition-all duration-300 ease-out relative bg-striped-strong';

  // @TODO: to w przyszłości prawdopodobnie przenieść trzeba do EventCapacityProgressComponent (jako analogiczny input customStatusText), bo wykracze poza odpowiedzialnośc progressbara
  readonly enrollmentsSummaryText = computed(() => {
    const participants = this.participantsCount();
    const enrollments = this.enrollmentsCount() ?? 0;
    const waiting = Math.max(0, enrollments - participants);

    if (participants === 0 && waiting === 0) {
      const baseText = this.translate('progress.noEnrollments');
      if (this.isJoinable()) {
        return `${baseText} - ${this.translate('progress.beFirst')}`;
      }
      return baseText;
    }

    if (waiting === 0) {
      if (participants > 0) {
        return `${participants} ${this.translatePlural('progress.participants', participants)}`;
      }
      return null;
    }

    if (participants === 0) {
      return `${waiting} ${this.translatePlural('progress.waiting', waiting)}`;
    }

    return `${participants} ${this.translatePlural('progress.participants', participants)} + ${waiting} ${this.translatePlural('progress.waiting', waiting)}`;
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
