import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  linkedSignal,
  signal,
  ViewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';
import {
  LayoutConfigService,
  HeroVariant,
  DesktopLayout,
  AsideSide,
} from './layout-config.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  NotificationState,
  NotificationStatusService,
} from '../../../core/services/notification-status.service';
import { BottomOverlaysService } from '../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { NotificationAlertComponent } from './notification/notification-alert/notification-alert.component';
import { NotificationOverlayComponent } from './notification/notification-overlay/notification-overlay.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { DEFAULT_COVER_IMAGE_URL } from '../../utils/cover-image.utils';

export interface RouteLayoutData {
  showHeader?: boolean;
  showFooter?: boolean;
  showBorder?: boolean;
  centerContent?: boolean;
  fullscreenContent?: boolean;
  contentClass?: string;
  layoutClass?: string;
  heroVariant?: HeroVariant;
  title?: string;
  subtitle?: string;
  desktopLayout?: DesktopLayout;
  asideSide?: AsideSide;
}

const DEFAULT_ROUTE_DATA: RouteLayoutData = {
  showHeader: false,
  showFooter: true,
  showBorder: false,
  centerContent: false,
  fullscreenContent: false,
  contentClass: '',
  layoutClass: '',
  heroVariant: 'compact',
  title: '',
  subtitle: '',
  desktopLayout: 'narrow',
  asideSide: 'right',
};

@Component({
  selector: 'app-page-layout',
  imports: [
    NgTemplateOutlet,
    IconComponent,
    NotificationAlertComponent,
    NotificationOverlayComponent,
    FooterComponent,
  ],
  templateUrl: './page-layout.component.html',
  host: { class: 'flex-1 flex flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLayoutComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigation = inject(NavigationService);
  private readonly auth = inject(AuthService);
  private readonly overlays = inject(BottomOverlaysService);
  readonly notifStatus = inject(NotificationStatusService);
  readonly layoutConfig = inject(LayoutConfigService);
  readonly breadcrumb = inject(BreadcrumbService);

  // ── Route data → layout flags ──
  private readonly routeData = toSignal(
    this.navigation.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(undefined),
      map(() => {
        let route = this.navigation.router.routerState.root;
        while (route.firstChild) route = route.firstChild;
        return { ...DEFAULT_ROUTE_DATA, ...route.snapshot.data } as RouteLayoutData;
      }),
    ),
    { initialValue: DEFAULT_ROUTE_DATA },
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.observer?.disconnect());

    // ── Sync route data to LayoutConfigService ──
    effect(() => {
      const data = this.routeData();
      this.layoutConfig.heroVariant.set(data.heroVariant || 'compact');
      this.layoutConfig.title.set(data.title ?? '');
      this.layoutConfig.subtitle.set(data.subtitle ?? '');
      this.layoutConfig.desktopLayout.set(data.desktopLayout || 'narrow');
      this.layoutConfig.asideSide.set(data.asideSide || 'right');
    });

    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    this.navigation.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart) {
        // Cancel any pending markReady from previous navigation (race condition fix)
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        this.layoutConfig.reset();
        // Close all active overlays when navigation starts
        this.overlays.close();
      }
      if (e instanceof NavigationEnd) {
        // setTimeout ensures Angular CD completes first → child effects configure layout
        readyTimer = setTimeout(() => {
          readyTimer = null;
          this.layoutConfig.markReady();
        });
      }
      if (e instanceof NavigationError) {
        // Lazy chunk load failure etc. - show content instead of infinite spinner
        this.layoutConfig.markReady();
      }
      if (e instanceof NavigationCancel) {
        // Guards normally trigger a redirect (new NavigationStart follows).
        // Defensive fallback: if no new navigation starts within 50ms, unblock UI.
        readyTimer = setTimeout(() => {
          readyTimer = null;
          if (!this.layoutConfig.isReady()) {
            this.layoutConfig.markReady();
          }
        }, 50);
      }
    });
  }

  readonly showFooter = computed(() => this.routeData().showFooter === true);
  readonly showBackButton = computed(() => !!this.breadcrumb.parentUrl());
  readonly miniBarOnly = computed(() => this.layoutConfig.heroVariant() === 'only-mini-bar');
  readonly showMiniBar = computed(() => this.miniBarOnly() || this.heroHidden());

  readonly notifBellState = computed<'off' | 'complete' | 'incomplete' | null>(() => {
    const state = this.notifStatus.state();
    switch (state) {
      case NotificationState.Off:
        return 'off';
      case NotificationState.OnComplete:
        return 'complete';
      case NotificationState.OnIncomplete:
        return 'incomplete';
      case NotificationState.NotLoggedIn:
        return 'off';
      default:
        return null;
    }
  });
  readonly centerContent = computed(() => this.routeData().centerContent === true);
  readonly contentClass = computed(() => this.routeData().contentClass || '');
  readonly layoutClass = computed(() => this.routeData().layoutClass || '');
  readonly showBorder = computed(() => this.routeData().showBorder === true);
  readonly fullscreenContent = computed(() => this.routeData().fullscreenContent === true);
  readonly showHeader = computed(() => {
    const heroVariant = this.layoutConfig.heroVariant();
    return heroVariant === 'only-mini-bar' ? true : this.routeData().showHeader === true;
  });

  // ── Derived from LayoutConfigService ──
  readonly coverUrl = computed(() => this.layoutConfig.coverImageUrl());

  // Faktyczny src hero-coveru: resetuje się przy zmianie URL, a przy błędzie
  // ładowania podmienia się na bundlowany default zamiast pokazywać gradient.
  readonly coverSrc = linkedSignal(() => this.coverUrl());
  readonly heroHeight = computed(() => `var(--hero-${this.layoutConfig.heroVariant()}-h)`);
  readonly hasTitle = computed(() => !!this.layoutConfig.title());
  readonly hasSubtitle = computed(
    () => !!this.layoutConfig.subtitleTemplate() || !!this.layoutConfig.subtitle(),
  );
  readonly hasSticky = computed(() => !!this.layoutConfig.stickyTemplate());

  // ── Template class helpers ──
  readonly resolvedContentClass = computed(
    () => this.contentClass() || this.layoutConfig.contentClass(),
  );

  readonly outerWrapperClass = computed(() =>
    [
      'flex flex-1 flex-col animate-fade-in',
      this.layoutClass() || 'bg-neutral-100',
      this.fullscreenContent() ? 'overflow-hidden' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  readonly heroContainerClass = computed(() =>
    [
      'fixed inset-x-0 top-app mx-auto max-w-app',
      this.showMiniBar()
        ? 'z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-neutral-200'
        : 'z-0',
    ].join(' '),
  );

  readonly heroContainerMinHeight = computed(() =>
    this.showMiniBar() ? 'auto' : this.heroHeight(),
  );

  // RWD-15: tryb dwukolumnowy aktywny, gdy widok deklaruje `two-column` ORAZ dostarczył aside.
  // `desktopLayout` pochodzi z `route.data` (spójne SSR↔klient); sam przełącznik 1↔2 kolumny
  // realizują klasy `lg:` (CSS), więc nie ma rozjazdu hydration.
  readonly twoColumn = computed(
    () => this.layoutConfig.desktopLayout() === 'two-column' && !!this.layoutConfig.asideTemplate(),
  );

  readonly showStaticHero = computed(() => this.twoColumn() && this.showHeader());

  // Sekcja fixed-hero (sentinel + hero + back/sticky) jest potrzebna < lg (pojedyncza kolumna).
  // Od `lg` w trybie 2-kol ją chowamy — jej rolę przejmuje statyczne hero w kolumnie głównej.
  // `contents` = wrapper przezroczysty dla layoutu; `lg:hidden` ukrywa też potomków `fixed`.
  readonly fixedHeaderClass = computed(() =>
    this.twoColumn() ? 'contents lg:hidden' : 'contents',
  );

  readonly sentinelClass = computed(() =>
    ['relative w-full shrink-0', this.twoColumn() ? 'lg:hidden' : ''].filter(Boolean).join(' '),
  );

  readonly mainColumnClass = computed(() => {
    if (!this.twoColumn()) {
      return 'contents';
    }
    const order = this.layoutConfig.asideSide() === 'left' ? 'lg:order-2' : 'lg:order-1';
    // `lg:gap-3` — równy odstęp między modułami w kolumnie głównej (hero ↔ karta treści).
    return `contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3 ${order}`;
  });

  readonly asideColumnClass = computed(() => {
    const order = this.layoutConfig.asideSide() === 'left' ? 'lg:order-1' : 'lg:order-2';
    // Wyrównany do góry (grid `items-start`), scrolluje się naturalnie z treścią (pkt 13) —
    // bez `sticky`/`top-app`, które przy `overflow:hidden` boxa spychały aside w dół o wys. nav.
    return `hidden lg:flex lg:w-aside lg:flex-col lg:gap-3 ${order}`;
  });

  readonly contentWrapperClass = computed(() => {
    const fs = this.fullscreenContent();
    const center = this.centerContent();
    const parts = ['relative mx-auto w-full'];
    if (fs) {
      parts.push('max-w-app flex-1 min-h-0 flex flex-col');
      if (center) {
        parts.push('items-center justify-center');
      }
      return parts.join(' ');
    }
    if (this.twoColumn()) {
      // < lg: pojedyncza wąska kolumna (jak dziś). Od `lg`: grid main + aside w szerszym boxie.
      // `lg:p-3 lg:gap-3` — moduły jako kafelki odsunięte od krawędzi boxa z równym odstępem.
      const cols =
        this.layoutConfig.asideSide() === 'left'
          ? 'lg:grid-cols-aside-main'
          : 'lg:grid-cols-main-aside';
      parts.push(`max-w-app lg:max-w-box lg:grid ${cols} lg:items-start lg:gap-3 lg:p-3`);
      if (this.showHeader()) {
        parts.push('-mt-6 lg:mt-0');
      }
      return parts.join(' ');
    }
    // Treść = wyśrodkowana kolumna główna `max-w-app` (700), hug-owana przez boxed look.
    parts.push('max-w-app');
    if (this.showHeader()) {
      parts.push('-mt-6');
    }
    if (center) {
      parts.push('flex flex-1 items-center justify-center');
    }
    return parts.join(' ');
  });

  readonly contentMarginTop = computed(() =>
    this.miniBarOnly() ? 'var(--hero-mini-bar-h)' : null,
  );

  readonly contentInnerClass = computed(() => {
    const cc = this.resolvedContentClass();
    const fs = this.fullscreenContent();
    const center = this.centerContent();
    if (fs && center) {
      // Wrapper handles centering; inner div must NOT have flex-1 so content stays natural size
      return cc || '';
    }
    if (fs) {
      return ['flex-1 min-h-0 flex flex-col', cc].filter(Boolean).join(' ');
    }
    return [
      'rounded-2xl border',
      this.showBorder() ? 'shadow-xs border-neutral-100' : 'border-transparent',
      center ? 'overflow-visible w-full' : 'overflow-hidden',
      cc,
    ]
      .filter(Boolean)
      .join(' ');
  });

  readonly showDragHandle = computed(
    () => !this.fullscreenContent() && this.showHeader() && !this.miniBarOnly(),
  );

  readonly showNotifAlert = computed(
    () => !this.fullscreenContent() && this.notifStatus.alertVisible(),
  );

  // ── Internal state ──
  readonly heroHidden = signal(false);
  readonly stickyContainer = signal<HTMLElement | null>(null);

  private observer: IntersectionObserver | null = null;

  @ViewChild('heroSentinel') set _heroSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    this.observer = null;
    if (ref) {
      this.observer = new IntersectionObserver(
        ([entry]) => this.heroHidden.set(!entry.isIntersecting),
        { threshold: 0, rootMargin: '-75px 0px 0px 0px' },
      );
      this.observer.observe(ref.nativeElement);
    } else {
      this.heroHidden.set(false);
    }
  }

  @ViewChild('stickyButtonContainer') set _stickyButtonContainer(
    ref: ElementRef<HTMLElement> | undefined,
  ) {
    this.stickyContainer.set(ref?.nativeElement ?? null);
  }

  // ── Hide elements with .hidden-in-sticky-template when mini-bar is active ──
  private readonly hideInStickyEffect = effect(() => {
    this.layoutConfig.stickyTemplate();
    const isMiniBar = this.showMiniBar();
    const stickyContainer = this.stickyContainer();

    if (!stickyContainer) return;

    const elements = stickyContainer.querySelectorAll('.hidden-in-sticky-template');
    elements.forEach((element) => {
      (element as HTMLElement).style.display = isMiniBar ? 'none' : '';
    });
  });

  goBack(): void {
    const url = this.breadcrumb.parentUrl();
    if (url) {
      this.navigation.router.navigateByUrl(url);
    }
  }

  onCoverImageError(): void {
    if (this.coverSrc() === DEFAULT_COVER_IMAGE_URL) return;
    this.coverSrc.set(DEFAULT_COVER_IMAGE_URL);
  }

  onNotifBellClick(): void {
    if (!this.auth.isLoggedIn()) {
      this.navigation.navigateToLogin(this.navigation.router.url);
      return;
    }
    this.overlays.open('notifications');
  }
}
