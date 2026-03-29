import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type TimeUnit = 'days' | 'hours' | 'minutes' | 'seconds';

/**
 * Zwraca klucz formy liczby mnogiej według polskiej gramatyki:
 * - one:  1, 101, 201, ...
 * - few:  2–4, 22–24, 32–34, ... (z wyjątkiem 12–14, 112–114, ...)
 * - many: 0, 5–21, 25–31, ...
 */
export function getPolishPluralKey(n: number): 'one' | 'few' | 'many' {
  if (n === 1) return 'one';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
  return 'many';
}

@Pipe({ name: 'timeUnit', standalone: true })
export class TimeUnitPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(count: number, unit: TimeUnit): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`time.${unit}.${form}`);
  }
}
