import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostBinding,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../ui/icon/icon.component';
import { LayoutConfigService } from './layout-config.service';
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
  contentClass?: string;
  fullscreen?: boolean;
}

const DEFAULT_ROUTE_DATA: RouteLayoutData = {
  showHeader: false,
  showFooter: true,
  showBorder: false,
  centerContent: false,
  contentClass: '',
  fullscreen: false,
};

@Component({
  selector: 'app-page-layout',
  imports: [
    CommonModule,
    IconComponent,
    NgTemplateOutlet,
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

  constructor() {
    this.destroyRef.onDestroy(() => this.observer?.disconnect());

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.layoutConfig.reset();
      });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        // setTimeout ensures Angular CD completes first → child effects configure layout
        setTimeout(() => this.layoutConfig.markReady());
      });
  }

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

  @HostBinding('class')
  get dynamicClass(): string {
    return this.contentClass();
  }

  private static readonly DEFAULT_COVER = 'assets/images/default-cover.png';

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
  readonly isFullscreen = computed(() => this.routeData().fullscreen === true);

  // ── Derived from LayoutConfigService ──
  readonly hasCover = computed(() => true);
  readonly coverUrl = computed(
    () => this.layoutConfig.coverImageUrl() || PageLayoutComponent.DEFAULT_COVER,
  );
  readonly hasTitle = computed(() => !!this.layoutConfig.titleText());
  readonly hasExtra = computed(() => !!this.layoutConfig.extraTpl());
  readonly hasSticky = computed(() => !!this.layoutConfig.stickyTpl());

  // ── Internal state ──
  readonly heroHidden = signal(false);
  readonly currentYear = new Date().getFullYear();

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
