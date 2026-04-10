import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { getPolishPluralKey } from '../utils/pluralization.utils';

export type TimeUnit = 'days' | 'hours' | 'minutes' | 'seconds';

@Pipe({ name: 'timeUnit', standalone: true })
export class TimeUnitPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(count: number, unit: TimeUnit): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`time.${unit}.${form}`);
  }
}
