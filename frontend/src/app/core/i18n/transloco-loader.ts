import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { pl } from './pl';

const translations: Record<string, Translation> = { pl };

@Injectable({ providedIn: 'root' })
export class TranslocoInlineLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const translation = translations[lang] ?? translations['pl'] ?? {};
    return of(translation);
  }
}
