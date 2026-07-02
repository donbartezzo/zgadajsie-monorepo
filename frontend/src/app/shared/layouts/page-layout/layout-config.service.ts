import { Injectable, signal, TemplateRef } from '@angular/core';

export type HeroVariant = 'compact' | 'extended' | 'only-mini-bar';

// Wariant układu kolumny treści na desktopie.
// 'narrow'      — domyślny, wąska kolumna główna (700) w boxie.
// 'wide'        — jednokolumnowa treść na całą szerokość boxa (700 → ~1024 od `lg`); bez aside.
// 'two-column'  — main (700) + aside (rail), box rośnie do ~1024 od `lg`.
export type DesktopLayout = 'narrow' | 'wide' | 'two-column';
export type AsideSide = 'left' | 'right';

export interface LayoutConfig {
  coverImageUrl: string;
  heroVariant: HeroVariant;
  contentClass: string;
  title: string;
  subtitle: string;
  subtitleTemplate: TemplateRef<unknown> | null;
  stickyTemplate: TemplateRef<unknown> | null;
  desktopLayout: DesktopLayout;
  asideSide: AsideSide;
  asideTemplate: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LayoutConfigService {
  static readonly DEFAULT_CONTENT = 'bg-neutral-100';

  readonly coverImageUrl = signal('');
  readonly heroVariant = signal<HeroVariant>('compact');
  readonly contentClass = signal(LayoutConfigService.DEFAULT_CONTENT);
  readonly title = signal('');
  readonly subtitle = signal('');
  readonly subtitleTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly stickyTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly desktopLayout = signal<DesktopLayout>('narrow');
  readonly asideSide = signal<AsideSide>('right');
  readonly asideTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly isReady = signal(false);

  reset(): void {
    this.isReady.set(false);
    this.contentClass.set(LayoutConfigService.DEFAULT_CONTENT);
    // NIE zerujemy tu hero/tytułu/podtytułu/cover ani desktopLayout/asideSide. Synchronizacja
    // z route.data (z defaultami) ustawia heroVariant/title/subtitle/desktopLayout/asideSide na
    // NavigationEnd, a cover/title hero — efekty stron. Trzymając je stabilnie:
    //  - box zachowuje szerokość (brak „skoku" --app-box-width 1024→700→1024),
    //  - shell nie „miga" przy szybkiej nawigacji (stara treść hero/nav zostaje do konfiguracji nowej
    //    strony — zachowanie SPA: nie chowamy shella, podmienia się tylko main-column).
    //
    // subtitleTemplate / stickyTemplate / asideTemplate are owned by LayoutSlotDirective
    // via its own lifecycle - resetting them here would orphan reused component instances
    // whose directive ngOnInit fires only once (e.g. a persistent aside owned by a parent
    // shell like EventAreaComponent that survives child-route navigation).
  }

  markReady(): void {
    this.isReady.set(true);
  }
}
