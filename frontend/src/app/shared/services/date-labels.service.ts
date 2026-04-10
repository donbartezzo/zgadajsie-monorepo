import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  calculateDurationParts,
  getDaysDiffTz,
  nowInZone,
  EventCountdown,
} from '@zgadajsie/shared';
import { getPolishPluralKey } from '../utils/pluralization.utils';

@Injectable({ providedIn: 'root' })
export class DateLabelsService {
  private readonly transloco = inject(TranslocoService);

  formatDuration(startsAt: string | Date | undefined, endsAt: string | Date | undefined): string {
    if (!startsAt || !endsAt) return '';
    const parts = calculateDurationParts(startsAt, endsAt);
    if (!parts) return '';

    const { days, hours, minutes } = parts;
    const hourAbbr = this.transloco.translate('time.hour');
    const minuteAbbr = this.transloco.translate('time.minute');

    if (days > 0) {
      const daysLabel = this.transloco.translate(`time.days.${getPolishPluralKey(days)}`);
      if (hours > 0 || minutes > 0) {
        return `${days} ${daysLabel} ${hours} ${hourAbbr} ${minutes} ${minuteAbbr}`;
      }
      return `${days} ${daysLabel}`;
    }

    if (hours > 0 && minutes > 0) {
      return `${hours} ${hourAbbr} ${minutes} ${minuteAbbr}`;
    }
    if (hours > 0) {
      return `${hours} ${hourAbbr}`;
    }
    return `${minutes} ${minuteAbbr}`;
  }

  getRelativeDateLabel(date: Date | string, now: Date | string = nowInZone().toJSDate()): string {
    const diff = getDaysDiffTz(date, now);
    if (diff === 0) return this.transloco.translate('time.relative.today');
    if (diff === 1) return this.transloco.translate('time.relative.tomorrow');
    if (diff === 2) return this.transloco.translate('time.relative.dayAfterTomorrow');
    if (diff === 7) return this.transloco.translate('time.relative.nextWeek');
    if (diff > 0) return this.transloco.translate('time.relative.inDays', { count: diff });
    if (diff === -1) return this.transloco.translate('time.relative.yesterday');
    if (diff === -2) return this.transloco.translate('time.relative.dayBeforeYesterday');
    return this.transloco.translate('time.relative.daysAgo', { count: Math.abs(diff) });
  }

  formatCountdownLabel(cd: EventCountdown): string {
    const hourAbbr = this.transloco.translate('time.hour');
    const minuteAbbr = this.transloco.translate('time.minute');
    if (cd.days > 0) {
      const daysLabel = this.transloco.translate(`time.days.${getPolishPluralKey(cd.days)}`);
      return `${cd.days} ${daysLabel} ${cd.hours} ${hourAbbr}`;
    }
    if (cd.hours > 0) {
      return `${cd.hours} ${hourAbbr} ${cd.minutes} ${minuteAbbr}`;
    }
    return `${cd.minutes} ${minuteAbbr}`;
  }
}
