import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Spójny „kafelek" kolumny aside. Zapewnia jednolite chrome (tło, ramka, zaokrąglenie,
 * cień, padding) dla KAŻDEJ zawartości aside — nawigacji (`app-aside-nav`), CTA, statystyk itp.
 * Dzięki temu wszystkie raile/panele boczne na różnych podstronach wyglądają tak samo.
 *
 * Użycie:
 *   <app-aside-panel heading="Panel organizatora">
 *     <app-aside-nav [items]="items()" (select)="..." />
 *   </app-aside-panel>
 */
@Component({
  selector: 'app-aside-panel',
  template: `
    <div class="rounded-2xl border border-neutral-100 bg-white p-3 shadow-xs">
      @if (heading()) {
        <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {{ heading() }}
        </p>
      }
      <ng-content />
    </div>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsidePanelComponent {
  /** Opcjonalny nagłówek sekcji nad zawartością. */
  readonly heading = input('');
}
