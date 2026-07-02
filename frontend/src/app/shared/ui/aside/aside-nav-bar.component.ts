import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { AsideNavItem } from './aside-nav.component';

/**
 * Globalny mobilny pasek nawigacji — wzorzec „priority+ / overflow". Mobilny odpowiednik pionowego
 * `app-aside-nav` (rail): wyświetla wyśrodkowane, ścieśnione „pills", ile zmieści się w jednej linii;
 * resztę chowa pod kebabem „⋮". Aktualnie wybrana pozycja jest ZAWSZE widoczna. Szerokości mierzone
 * ukrytym „ghostem" + ResizeObserver. Karmiony `items` (z `active`), emituje `selected(key)` —
 * używany przez panel konta, admina, strefę wydarzenia itd.
 */
@Component({
  selector: 'app-aside-nav-bar',
  imports: [IconComponent],
  templateUrl: './aside-nav-bar.component.html',
  host: { class: 'block', '(document:keydown.escape)': 'closeMore()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsideNavBarComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<readonly AsideNavItem[]>();
  readonly ariaLabel = input('Nawigacja');
  readonly selected = output<string>();

  readonly allItems = computed<readonly AsideNavItem[]>(() => this.items());

  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');
  private readonly ghostPills = viewChildren<ElementRef<HTMLElement>>('ghostPill');

  readonly visibleCount = signal(Number.MAX_SAFE_INTEGER);
  readonly moreOpen = signal(false);

  readonly pillClass =
    'shrink-0 inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium whitespace-nowrap text-neutral-600 transition-colors hover:bg-neutral-100';
  readonly activePillClass =
    'shrink-0 inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-primary-700';
  readonly kebabClass =
    'shrink-0 inline-flex h-7 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100';
  readonly menuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100';
  readonly activeMenuItemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-primary-50 text-primary-700';

  // Bufor + szerokości elementów stałych (px). Bufor lekko zaniża, by aktywny (pogrubiony, szerszy)
  // pill nie wypadł poza linię oraz by został odstęp po bokach.
  private readonly KEBAB_W = 40;
  private readonly GAP = 6;
  private readonly BUFFER = 28;

  readonly visibleItems = computed<readonly AsideNavItem[]>(() => {
    const all = this.allItems();
    const count = Math.min(this.visibleCount(), all.length);
    if (count >= all.length) {
      return all;
    }
    const visible = all.slice(0, count);
    // Gwarancja: aktywna pozycja zawsze na pasku — jeśli wypadłaby do overflow, podmień ostatnią.
    const activeIdx = all.findIndex((i) => i.active);
    if (activeIdx >= count && count > 0) {
      return [...all.slice(0, count - 1), all[activeIdx]];
    }
    return visible;
  });

  readonly overflowItems = computed<readonly AsideNavItem[]>(() => {
    const visibleKeys = new Set(this.visibleItems().map((i) => i.key));
    return this.allItems().filter((i) => !visibleKeys.has(i.key));
  });

  constructor() {
    afterNextRender(() => {
      const el = this.bar()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.recompute(el.clientWidth));
      observer.observe(el);
      this.recompute(el.clientWidth);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Zmiana pozycji/aktywnej zmienia szerokości pills — przelicz po wyrenderowaniu nowego ghosta.
    effect(() => {
      this.allItems();
      this.scheduleMeasure();
    });
  }

  private scheduleMeasure(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      return;
    }
    requestAnimationFrame(() => {
      const el = this.bar()?.nativeElement;
      if (el) {
        this.recompute(el.clientWidth);
      }
    });
  }

  private recompute(width: number): void {
    const pills = this.ghostPills();
    if (!width || pills.length === 0) {
      return;
    }
    const widths = pills.map((p) => p.nativeElement.offsetWidth);
    if (widths.some((w) => w <= 0)) {
      return;
    }
    const totalAll = widths.reduce((a, b) => a + b, 0) + this.GAP * (widths.length - 1);
    if (totalAll <= width - this.BUFFER) {
      this.visibleCount.set(widths.length);
      return;
    }
    const available = width - this.BUFFER - this.KEBAB_W - this.GAP;
    let acc = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const add = widths[i] + (i > 0 ? this.GAP : 0);
      if (acc + add <= available) {
        acc += add;
        count++;
      } else {
        break;
      }
    }
    this.visibleCount.set(Math.max(count, 1));
  }

  select(key: string): void {
    this.moreOpen.set(false);
    this.selected.emit(key);
  }

  toggleMore(): void {
    this.moreOpen.update((v) => !v);
  }

  closeMore(): void {
    this.moreOpen.set(false);
  }
}
