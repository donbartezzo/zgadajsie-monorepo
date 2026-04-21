import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';
import { LayoutConfigService, HeroVariant } from './layout-config.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  NotificationState,
  NotificationStatusService,
} from '../../../core/services/notification-status.service';
import { BottomOverlaysService } from '../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { NotificationAlertComponent } from './notification/notification-alert/notification-alert.component';
import { NotificationOverlayComponent } from './notification/notification-overlay/notification-overlay.component';
import { FooterComponent } from '../../../layout/footer/footer.component';

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
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly overlays = inject(BottomOverlaysService);
  readonly notifStatus = inject(NotificationStatusService);
  readonly layoutConfig = inject(LayoutConfigService);
  readonly breadcrumb = inject(BreadcrumbService);

  // ── Route data → layout flags ──
  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(undefined),
      map(() => {
        let route = this.router.routerState.root;
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
    });

    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
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
        // Lazy chunk load failure etc. — show content instead of infinite spinner
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

    // ── Reset cover error state when URL changes ──
    effect(() => {
      this.coverUrl(); // track dependency
      this.coverImageError.set(false);
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
      'fixed inset-x-0 top-0 mx-auto max-w-app',
      this.showMiniBar()
        ? 'z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-neutral-200'
        : 'z-0',
    ].join(' '),
  );

  readonly heroContainerMinHeight = computed(() =>
    this.showMiniBar() ? 'auto' : this.heroHeight(),
  );

  readonly contentWrapperClass = computed(() => {
    const fs = this.fullscreenContent();
    const parts = ['relative'];
    if (fs) {
      parts.push('flex-1 min-h-0 flex flex-col');
    } else {
      if (this.showHeader()) {
        parts.push('-mt-6');
      }
      if (this.centerContent()) {
        parts.push('flex flex-1 items-center justify-center');
      }
    }
    return parts.join(' ');
  });

  readonly contentMarginTop = computed(() =>
    this.miniBarOnly() ? 'var(--hero-mini-bar-h)' : null,
  );

  readonly contentInnerClass = computed(() => {
    const cc = this.resolvedContentClass();
    if (this.fullscreenContent()) {
      return ['flex-1 min-h-0 flex flex-col', cc].filter(Boolean).join(' ');
    }
    return [
      'rounded-2xl border',
      this.showBorder() ? 'shadow-xs border-neutral-100' : 'border-transparent',
      this.centerContent() ? 'overflow-visible w-full' : 'overflow-hidden',
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
  readonly coverImageError = signal(false);

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

  goBack(): void {
    const url = this.breadcrumb.parentUrl();
    if (url) {
      this.router.navigateByUrl(url);
    }
  }

  onCoverImageError(): void {
    this.coverImageError.set(true);
  }

  onNotifBellClick(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.overlays.open('notifications');
  }
}
