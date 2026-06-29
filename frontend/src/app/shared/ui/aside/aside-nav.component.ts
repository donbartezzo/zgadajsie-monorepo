import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export interface AsideNavItem {
  /** Klucz pozycji emitowany przez `select`. */
  key: string;
  label: string;
  icon?: IconName;
  active?: boolean;
  /** Opcjonalny licznik (np. nieprzeczytane) wyświetlany jako badge. */
  badge?: number | null;
}

/**
 * Spójna lista nawigacyjna kolumny aside (RWD-15/16+). Jedno źródło stylów pozycji i stanu
 * aktywnego dla wszystkich raili (event, organizator, kolejne). Logikę nawigacji i wyliczanie
 * `active` trzyma komponent-właściciel; tutaj jest tylko prezentacja + emisja `select(key)`.
 */
@Component({
  selector: 'app-aside-nav',
  imports: [IconComponent],
  template: `
    <nav class="flex flex-col gap-1">
      @for (item of items(); track item.key) {
        <button
          type="button"
          [class]="item.active ? activeItemClass : itemClass"
          (click)="selected.emit(item.key)"
        >
          @if (item.icon) {
            <app-icon [name]="item.icon" size="sm" />
          }
          <span class="flex-1 text-left">{{ item.label }}</span>
          @if (item.badge) {
            <span
              class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-semibold text-white"
            >
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          }
        </button>
      }
    </nav>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsideNavComponent {
  readonly items = input.required<readonly AsideNavItem[]>();
  readonly selected = output<string>();

  readonly itemClass =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100';
  readonly activeItemClass =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold bg-primary-50 text-primary-700';
}
