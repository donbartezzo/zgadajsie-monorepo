import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type PageHeadingSize = 'lg' | 'xl' | '2xl';
export type PageHeadingSpacing = 'none' | 'sm' | 'md' | 'lg';

/**
 * Globalny nagłówek strony — jedno źródło prawdy dla `h1`, opcjonalnego nadtytułu (`label`),
 * opisu (`description`), akcji (slot `actions`), ikony (slot `icon`) oraz prefiksu (slot `prefix`).
 *
 * Używany WSZĘDZIE: panel konta (przez `app-account-content`), formularze, admin,
 * strony auth/statyczne (`centered`) oraz strony stanowe.
 *
 * Sloty (treść musi być bezpośrednim dzieckiem z atrybutem `slot`):
 * - `slot="icon"`   — ikona/okrąg nad nagłówkiem (głównie warianty `centered`)
 * - `slot="prefix"` — element przed `h1` (np. strzałka „wstecz")
 * - `slot="actions"`— przyciski po prawej stronie nagłówka
 * - `slot="below"`  — dowolna treść pod opisem (np. dodatkowe przyciski stanowe)
 */
@Component({
  selector: 'app-page-heading',
  template: `
    @let _centered = centered();
    <div [class]="containerClasses()">
      <ng-content select="[slot='icon']" />
      @if (label(); as _label) {
        <div class="flex items-center gap-2">
          <p class="text-xs font-medium uppercase tracking-wide text-primary-500">{{ _label }}</p>
          <ng-content select="[slot='meta']" />
        </div>
      }
      <div [class]="rowClasses()">
        <ng-content select="[slot='prefix']" />
        <h1 [class]="headingClasses()">{{ heading() }}</h1>
        @if (!_centered) {
          <ng-content select="[slot='actions']" />
        }
      </div>
      @if (description(); as _description) {
        <p [class]="descriptionClasses()">{{ _description }}</p>
      }
      <ng-content select="[slot='below']" />
    </div>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeadingComponent {
  /** Tytuł renderowany jako `h1`. */
  readonly heading = input.required<string>();

  /** Rozmiar `h1`: `xl` (domyślny panel/formularze/admin), `2xl` (auth/statyczne), `lg` (strony stanowe). */
  readonly size = input<PageHeadingSize>('xl');

  /** Nadtytuł renderowany nad `h1` (np. „Seria wydarzeń"). */
  readonly label = input('');

  /** Opis renderowany pod `h1`. */
  readonly description = input('');

  /** Układ wyśrodkowany (auth, strony stanowe). Ukrywa slot `actions`. */
  readonly centered = input(false, { transform: booleanAttribute });

  /** Odstęp pod całością nagłówka. */
  readonly spacing = input<PageHeadingSpacing>('md');

  readonly containerClasses = computed(() => {
    const spacingMap: Record<PageHeadingSpacing, string> = {
      none: '',
      sm: 'mb-2',
      md: 'mb-4',
      lg: 'mb-6',
    };
    const base = this.centered() ? 'flex flex-col items-center text-center' : '';
    return [base, spacingMap[this.spacing()]].filter(Boolean).join(' ');
  });

  readonly rowClasses = computed(() => {
    if (this.centered()) {
      return 'flex items-center justify-center gap-3';
    }
    return 'flex min-h-11 items-center justify-between gap-3';
  });

  readonly headingClasses = computed(() => {
    const sizeMap: Record<PageHeadingSize, string> = {
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    };
    return `${sizeMap[this.size()]} font-bold text-neutral-900`;
  });

  readonly descriptionClasses = computed(() =>
    this.centered() ? 'mt-2 text-sm text-neutral-500' : 'mt-1 text-sm text-neutral-500',
  );
}
