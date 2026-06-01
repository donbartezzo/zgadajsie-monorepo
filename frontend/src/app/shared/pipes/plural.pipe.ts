import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { getPolishPluralKey } from '../utils/pluralization.utils';

@Pipe({ name: 'translatePlural', standalone: true })
export class PluralPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(count: number, key: string): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`${key}.${form}`);
  }
}
