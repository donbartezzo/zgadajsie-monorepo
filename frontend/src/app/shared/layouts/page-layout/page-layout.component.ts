import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostBinding,
  effect,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';
import { LayoutConfigService, HeroVariant } from './layout-config.service';
import { GlobalInfoPageService } from './global-info-page.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { AuthService } from '../../../core/auth/auth.service';
import { nowInZone } from '@zgadajsie/shared';
import {
  NotificationState,
  NotificationStatusService,
} from '../../../core/services/notification-status.service';
import { BottomOverlaysService } from '../../overlay/ui/bottom-overlays/bottom-overlays.service';
import { NotificationAlertComponent } from './notification/notification-alert/notification-alert.component';
import { NotificationOverlayComponent } from './notification/notification-overlay/notification-overlay.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { InfoPageComponent } from '../../../features/info/pages/info-page/info-page.component';

export interface RouteLayoutData {
  showHeader?: boolean;
  showFooter?: boolean;
  showBorder?: boolean;
  centerContent?: boolean;
  contentClass?: string;
  heroVariant?: HeroVariant;
  title?: string;
  subtitle?: string;
}

const DEFAULT_ROUTE_DATA: RouteLayoutData = {
  showHeader: false,
  showFooter: true,
  showBorder: false,
  centerContent: false,
  contentClass: '',
  heroVariant: 'compact',
  title: '',
  subtitle: '',
};

@Component({
  selector: 'app-page-layout',
  imports: [
    CommonModule,
    IconComponent,
    NgTemplateOutlet,
    InfoPageComponent,
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
  readonly globalInfoPage = inject(GlobalInfoPageService);
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

    // ── Auto-hide info page on navigation ──
    effect(() => {
      // This effect runs whenever routeData changes (navigation)
      this.routeData();
      this.globalInfoPage.hide();
    });

    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.layoutConfig.reset();
        this.globalInfoPage.hide();
      }
      if (e instanceof NavigationEnd) {
        // setTimeout ensures Angular CD completes first → child effects configure layout
        setTimeout(() => this.layoutConfig.markReady());
      }
    });

    // ── Validate cover image URL ──
    effect(() => {
      const url = this.coverUrl();
      if (!url) {
        this.coverImageValid.set(false);
        return;
      }

      // Test if image exists by trying to load it
      const img = new Image();
      img.onload = () => this.coverImageValid.set(true);
      img.onerror = () => this.coverImageValid.set(false);
      img.src = url;
    });
  }

  @HostBinding('class')
  get dynamicClass(): string {
    return this.contentClass();
  }

  readonly showHeader = computed(() => this.routeData().showHeader === true);
  readonly showFooter = computed(() => this.routeData().showFooter === true);
  readonly showBackButton = computed(() => !!this.breadcrumb.parentUrl());

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
  readonly showBorder = computed(() => this.routeData().showBorder === true);

  // ── Derived from LayoutConfigService ──
  readonly coverUrl = computed(() => this.layoutConfig.coverImageUrl());
  readonly heroHeight = computed(() => `var(--hero-${this.layoutConfig.heroVariant()}-h)`);
  readonly hasTitle = computed(() => !!this.layoutConfig.title());
  readonly hasSubtitle = computed(
    () => !!this.layoutConfig.subtitleTemplate() || !!this.layoutConfig.subtitle(),
  );
  readonly hasSticky = computed(() => !!this.layoutConfig.stickyTemplate());

  // ── Internal state ──
  readonly heroHidden = signal(false);
  readonly coverImageValid = signal(false);
  readonly currentYear = nowInZone().year;

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

  onNotifBellClick(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.overlays.open('notifications');
  }
}
