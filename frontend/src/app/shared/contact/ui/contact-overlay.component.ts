import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { BottomOverlayComponent } from '../../overlay/ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { ContactFormComponent } from './contact-form.component';
import { ContactSource } from '@zgadajsie/shared';
import { DictionaryService } from '../../../core/services/dictionary.service';

@Component({
  selector: 'app-contact-overlay',
  imports: [BottomOverlayComponent, ContactFormComponent],
  template: `
    @let _citySlug = contactCitySlug();
    @let _cityName = cityName();

    <app-bottom-overlay [open]="isOpen()" (closed)="close()">
      <div class="max-w-lg mx-auto">
        <h2 class="text-lg font-bold text-neutral-900 mb-2">Kontakt z obsługą</h2>
        @if (_citySlug) {
          <p class="text-sm text-neutral-500 mb-4">
            Daj nam znać, jak możemy sobie pomóc i razem budować lokalną społeczność sportową w
            mieście <span class="font-semibold text-neutral-700">{{ _cityName || _citySlug }}</span>
          </p>
        } @else {
          <p class="text-sm text-neutral-500 mb-4">Masz pytanie lub sugestię? Napisz do nas!</p>
        }
        <app-contact-form [source]="ContactSource.CITY_EVENTS" [citySlug]="_citySlug" />
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactOverlayComponent {
  private readonly overlays = inject(BottomOverlaysService);
  private readonly dictionary = inject(DictionaryService);

  readonly isOpen = computed(() => this.overlays.active() === 'contact');
  readonly contactCitySlug = computed(() => this.overlays.contactCitySlug() || undefined);

  private readonly city = toSignal(
    toObservable(this.contactCitySlug).pipe(
      switchMap((slug) => (slug ? this.dictionary.getCityBySlug(slug) : of(null))),
    ),
    { initialValue: null },
  );

  readonly cityName = computed(() => {
    const city = this.city();
    return (city as { name?: string } | null)?.name || null;
  });

  readonly ContactSource = ContactSource;

  close(): void {
    this.overlays.close();
  }
}
