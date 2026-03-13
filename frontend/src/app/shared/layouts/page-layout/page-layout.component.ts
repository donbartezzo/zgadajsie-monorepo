import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, NavigationStart, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../../../core/icons/icon.component';
import { LayoutConfigService } from './layout-config.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-page-layout',
  imports: [CommonModule, RouterLink, IconComponent, NgTemplateOutlet],
  templateUrl: './page-layout.component.html',
  host: { class: 'flex-1 flex flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLayoutComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
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
        return route.snapshot.data;
      }),
    ),
    { initialValue: undefined },
  );

  readonly showHeader = computed(() => this.routeData()?.['showHeader'] !== false);
  readonly showFooter = computed(() => {
    const routeData = this.routeData();
    const showFooter = routeData ? routeData['showFooter'] !== false : false;
    return showFooter;
  });
  readonly showBackButton = computed(() => !!this.breadcrumb.parentUrl());
  readonly centerContent = computed(() => this.routeData()?.['centerContent'] === true);
  readonly contentBgColor = computed(() => this.routeData()?.['contentBgColor'] || '');

  private static readonly DEFAULT_COVER = 'assets/images/default-cover.png';

  // ── Derived from LayoutConfigService ──
  readonly hasCover = computed(() => true);
  readonly coverUrl = computed(
    () => this.layoutConfig.coverImageUrl() || PageLayoutComponent.DEFAULT_COVER,
  );
  readonly hasTitle = computed(() => !!this.layoutConfig.titleText());
  readonly hasExtra = computed(() => !!this.layoutConfig.extraTpl());
  readonly hasSticky = computed(() => !!this.layoutConfig.stickyTpl());
  readonly isDefaultBg = computed(
    () => this.layoutConfig.contentBgClass() === LayoutConfigService.DEFAULT_CONTENT_BG,
  );

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

  constructor() {
    this.destroyRef.onDestroy(() => this.observer?.disconnect());

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.layoutConfig.coverImageUrl.set('');
        this.layoutConfig.contentBgClass.set(LayoutConfigService.DEFAULT_CONTENT_BG);
        this.layoutConfig.titleText.set('');
      });
  }

  goBack(): void {
    const url = this.breadcrumb.parentUrl();
    if (url) {
      this.router.navigateByUrl(url);
    }
  }
}
