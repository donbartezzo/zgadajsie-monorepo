import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { EventCardComponent } from '../../../../shared/event/ui/event-card/event-card.component';
import { NextEventBadgeComponent } from '../../../../shared/event/ui/next-event-badge/next-event-badge.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { AppTitleService } from '../../../../core/services/app-title.service';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CitySubscriptionService } from '../../../../core/services/city-subscription.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { EventBase } from '../../../../shared/types';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { nowInZone, daysFromNow, toZonedDateTime, formatDateNoYear } from '@zgadajsie/shared';
import { NotificationStatusService } from '../../../../core/services/notification-status.service';
import { CitySearchComponent } from '../../../../shared/city/city-search/city-search.component';

interface EventGroup {
  key: string;
  label: string;
  sublabel?: string;
  events: EventBase[];
}

@Component({
  selector: 'app-events',
  imports: [
    EventCardComponent,
    NextEventBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    LayoutSlotDirective,
    CitySearchComponent,
  ],
  templateUrl: './events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent implements OnInit, OnDestroy {
  // ── Inject ──
  private readonly route = inject(ActivatedRoute);
  private readonly navigation = inject(NavigationService);
  private readonly eventService = inject(EventService);
  private readonly layoutConfig = inject(LayoutConfigService);
  private readonly auth = inject(AuthService);
  private readonly citySubscriptionService = inject(CitySubscriptionService);
  private readonly dictionary = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);
  private readonly notifStatus = inject(NotificationStatusService);
  private readonly appTitle = inject(AppTitleService);

  // ── Reactive citySlug from route params (reacts to navigation on reused component) ──
  readonly citySlug = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('citySlug') ?? ''),
      distinctUntilChanged(),
    ),
    { initialValue: this.route.snapshot.paramMap.get('citySlug') ?? '' },
  );

  readonly events = signal<EventBase[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cityName = signal('');
  readonly cityId = signal('');
  readonly citySubscribed = signal(false);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  private readonly nowMs = signal(nowInZone().toMillis());
  private tickInterval?: ReturnType<typeof setInterval>;

  readonly groupedEvents = computed(() => {
    const nowMs = this.nowMs();
    const now = nowInZone();

    const ongoing: EventBase[] = [];
    const upcoming: EventBase[] = [];
    const past: EventBase[] = [];

    for (const event of this.events()) {
      const start = toZonedDateTime(event.startsAt).toJSDate().getTime();
      const end = toZonedDateTime(event.endsAt).toJSDate().getTime();

      if (start <= nowMs && end > nowMs) {
        ongoing.push(event);
      } else if (end > nowMs) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    const byStartAsc = (a: EventBase, b: EventBase) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    const byStartDesc = (a: EventBase, b: EventBase) =>
      new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();

    ongoing.sort(byStartAsc);
    upcoming.sort(byStartAsc);
    past.sort(byStartDesc);

    const groups: EventGroup[] = [];

    if (ongoing.length > 0) {
      groups.push({
        key: 'ongoing',
        label: 'Aktualnie trwające',
        events: ongoing,
      });
    }

    if (upcoming.length > 0) {
      const today = now.toJSDate();
      const weekFromNow = daysFromNow(7);
      groups.push({
        key: 'upcoming',
        label: 'Najbliższy tydzień',
        sublabel: `${formatDateNoYear(today)} - ${formatDateNoYear(weekFromNow)}`,
        events: upcoming,
      });
    }

    if (past.length > 0) {
      const today = now.toJSDate();
      const weekAgo = daysFromNow(-7);
      groups.push({
        key: 'past',
        label: 'Miniony tydzień',
        sublabel: `${formatDateNoYear(weekAgo)} - ${formatDateNoYear(today)}`,
        events: past,
      });
    }

    return groups;
  });

  readonly nextUpcomingEvent = computed(() => {
    const upcomingGroup = this.groupedEvents().find((group) => group.key === 'upcoming');

    return upcomingGroup?.events[0] ?? null;
  });

  private page = 1;
  private hasMore = true;

  constructor() {
    // Slug-driven: apply hero cover + reload city data. Fires in a microtask
    // after PageLayout's synchronous NavigationStart reset, so the cover wins.
    effect(() => {
      const slug = this.citySlug();
      if (!slug) return;
      this.layoutConfig.coverImageUrl.set(`assets/covers/cities/${slug}.webp`);
      this.resetCityState();
      this.loadCityInfo(slug);
      this.loadEvents(slug);
    });

    // Name-driven: apply hero + document title once the resolved name lands.
    effect(() => {
      const name = this.cityName();
      if (!name) return;
      this.layoutConfig.title.set(name);
      this.appTitle.setResolvedTitle('Lista wydarzeń', name);
    });

    // Notification status follows the city resource.
    effect(() => {
      const id = this.cityId();
      if (!id) return;
      this.notifStatus.setConfig({
        resourceType: 'city',
        resourceId: id,
        resourceLabel: this.cityName(),
        subscribed: this.citySubscribed(),
        canToggle: true,
        onSubscribe: () => this.subscribeToCityInternal(),
        onUnsubscribe: () => this.unsubscribeFromCityInternal(),
      });
    });
  }

  ngOnInit(): void {
    this.tickInterval = setInterval(() => this.nowMs.set(nowInZone().toMillis()), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
    this.notifStatus.clearConfig();
  }

  onEventSelected(event: EventBase): void {
    const slug = event.city?.slug || this.citySlug();
    this.navigation.navigateToEventDetail(event.id, slug);
  }

  onScroll(): void {
    if (!this.isLoading() && this.hasMore) {
      this.loadEvents(this.citySlug());
    }
  }

  protected subscribeToCityInternal(): void {
    const id = this.cityId();
    if (!id || this.citySubscribed()) return;
    this.citySubscriptionService.subscribe(id).subscribe({
      next: () => {
        this.citySubscribed.set(true);
        this.notifStatus.updateSubscribed(true);
        this.snackbar.success('Powiadomienia włączone');
      },
      error: () => this.snackbar.error('Nie udało się włączyć powiadomień'),
    });
  }

  private unsubscribeFromCityInternal(): void {
    const id = this.cityId();
    if (!id || !this.citySubscribed()) return;
    this.citySubscriptionService.unsubscribe(id).subscribe({
      next: () => {
        this.citySubscribed.set(false);
        this.notifStatus.updateSubscribed(false);
        this.snackbar.info('Powiadomienia wyłączone');
      },
      error: () => this.snackbar.error('Nie udało się wyłączyć powiadomień'),
    });
  }

  private resetCityState(): void {
    this.events.set([]);
    this.cityName.set('');
    this.cityId.set('');
    this.citySubscribed.set(false);
    this.error.set(null);
    this.isLoading.set(true);
    this.page = 1;
    this.hasMore = true;
    this.notifStatus.clearConfig();
  }

  private loadEvents(slug: string): void {
    if (!this.hasMore || !slug) return;
    this.eventService
      .getEvents({ page: this.page, limit: 20, sortBy: 'startsAt', citySlug: slug })
      .subscribe({
        next: (res) => {
          if (this.citySlug() !== slug) return;
          this.events.update((prev) => [...prev, ...res.data]);
          if (!this.cityName() && res.data.length > 0) {
            const city = res.data[0].city;

            if (city) {
              const name = city.name || '';
              const id = city.slug || '';
              this.cityName.set(name);
              this.cityId.set(id);
              this.loadCitySubscription(id);
            }
          }
          this.hasMore = res.data.length === 20;
          this.page++;
          this.isLoading.set(false);
        },
        error: (err) => {
          if (this.citySlug() !== slug) return;
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.navigation.navigateToNotFoundWithReason('city-not-found');
            return;
          }
          this.error.set('Nie udało się pobrać wydarzeń');
          this.isLoading.set(false);
        },
      });
  }

  private loadCitySubscription(cityId: string): void {
    if (!this.isLoggedIn() || !cityId) return;
    this.citySubscriptionService.isSubscribed(cityId).subscribe({
      next: (res) => this.citySubscribed.set(res.subscribed),
    });
  }

  private loadCityInfo(slug: string): void {
    this.dictionary.getCityBySlug(slug).subscribe({
      next: (city) => {
        if (this.citySlug() !== slug) return;
        if (!this.cityName()) {
          this.cityName.set(city.name);
          this.cityId.set(city.slug);
          this.loadCitySubscription(city.slug);
        }
      },
    });
  }
}
