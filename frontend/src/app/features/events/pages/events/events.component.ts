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
import { ActivatedRoute, Router } from '@angular/router';
import { EventCardComponent } from '../../../../shared/event/ui/event-card/event-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { DateBadgeComponent } from '../../../../shared/event/ui/date-badge/date-badge.component';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CitySubscriptionService } from '../../../../core/services/city-subscription.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { EventListItem } from '../../../../shared/types';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { getDaysDiff, getRelativeDateLabel } from '../../../../shared/utils/date.utils';
import { NotificationStatusService } from '../../../../core/services/notification-status.service';

interface EventGroup {
  dateKey: string;
  label: string;
  shortLabel: string | null;
  isToday: boolean;
  isPast: boolean;
  isOngoing: boolean;
  events: EventListItem[];
}

interface DateGroup {
  dateKey: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  events: EventListItem[];
}

@Component({
  selector: 'app-events',
  imports: [
    EventCardComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    DateBadgeComponent,
    LayoutSlotDirective,
  ],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent implements OnInit, OnDestroy {
  // ── Inject ──
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly layoutConfig = inject(LayoutConfigService);
  private readonly auth = inject(AuthService);
  private readonly citySubscriptionService = inject(CitySubscriptionService);
  private readonly snackbar = inject(SnackbarService);
  private readonly notifStatus = inject(NotificationStatusService);

  readonly events = signal<EventListItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cityName = signal('');
  readonly cityId = signal('');
  readonly citySubscribed = signal(false);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  readonly dateRangeFrom = computed(() => {
    const d = new Date();
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase(),
    };
  });

  readonly dateRangeTo = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase(),
    };
  });

  readonly groupedEvents = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const ongoing: EventListItem[] = [];
    const upcoming: EventListItem[] = [];
    const past: EventListItem[] = [];

    for (const event of this.events()) {
      const start = new Date(event.startsAt).getTime();
      const end = new Date(event.endsAt).getTime();
      const nowMs = now.getTime();

      if (start <= nowMs && end > nowMs) {
        ongoing.push(event);
      } else if (end > nowMs) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    const byStartAsc = (a: EventListItem, b: EventListItem) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    ongoing.sort(byStartAsc);
    upcoming.sort(byStartAsc);
    past.sort(byStartAsc);

    const groups: EventGroup[] = [];

    if (ongoing.length > 0) {
      groups.push({
        dateKey: '__ongoing',
        label: 'Trwające',
        shortLabel: null,
        isToday: false,
        isPast: false,
        isOngoing: true,
        events: ongoing,
      });
    }

    const upcomingByDate = this.groupByDate(upcoming, todayStart);
    for (const g of upcomingByDate) {
      groups.push({ ...g, isPast: false, isOngoing: false });
    }

    if (past.length > 0) {
      groups.push({
        dateKey: '__past',
        label: 'Niedawno zakończone',
        shortLabel: null,
        isToday: false,
        isPast: true,
        isOngoing: false,
        events: past,
      });
    }

    return groups;
  });

  private citySlug = '';
  private page = 1;
  private hasMore = true;

  constructor() {
    effect(() => {
      const id = this.cityId();
      const name = this.cityName();
      const subscribed = this.citySubscribed();
      if (id) {
        this.notifStatus.setConfig({
          resourceType: 'city',
          resourceId: id,
          resourceLabel: name,
          subscribed,
          canToggle: true,
          onSubscribe: () => this.subscribeToCityInternal(),
          onUnsubscribe: () => this.unsubscribeFromCityInternal(),
        });
      }
    });
  }

  ngOnInit(): void {
    this.citySlug = this.route.snapshot.paramMap.get('citySlug') ?? '';

    if (this.citySlug) {
      this.layoutConfig.coverImageUrl.set(`assets/covers/cities/${this.citySlug}.webp`);
    }
    this.loadEvents();
  }

  loadEvents(): void {
    if (!this.hasMore) return;
    this.eventService
      .getEvents({ page: this.page, limit: 20, sortBy: 'startsAt', citySlug: this.citySlug })
      .subscribe({
        next: (res) => {
          this.events.update((prev) => [...prev, ...res.data]);
          if (!this.cityName() && res.data.length > 0) {
            const city = res.data[0].city;

            if (city) {
              const name = city.name || '';
              const id = city.id || '';
              this.cityName.set(name);
              this.cityId.set(id);
              this.layoutConfig.title.set(name);
              this.loadCitySubscription(id);
            }
          }
          this.hasMore = res.data.length === 20;
          this.page++;
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Nie udało się pobrać wydarzeń');
          this.isLoading.set(false);
        },
      });
  }

  onEventSelected(event: EventListItem): void {
    const slug = event.city?.slug || this.citySlug;
    this.router.navigate(['/w', slug, event.id]);
  }

  onScroll(): void {
    if (!this.isLoading() && this.hasMore) {
      this.loadEvents();
    }
  }

  ngOnDestroy(): void {
    this.notifStatus.clearConfig();
  }

  private subscribeToCityInternal(): void {
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

  private loadCitySubscription(cityId: string): void {
    if (!this.isLoggedIn() || !cityId) return;
    this.citySubscriptionService.isSubscribed(cityId).subscribe({
      next: (res) => this.citySubscribed.set(res.subscribed),
    });
  }

  private groupByDate(events: EventListItem[], todayStart: Date): DateGroup[] {
    const groups: DateGroup[] = [];
    const todayKey = `${todayStart.getFullYear()}-${todayStart.getMonth()}-${todayStart.getDate()}`;

    for (const event of events) {
      const d = new Date(event.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const isToday = key === todayKey;
      const diffDays = getDaysDiff(d, todayStart);
      const shortLabel = getRelativeDateLabel(d, todayStart);

      const dateStr = d.toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const sub = `<span class="opacity-60 font-normal ml-1">· ${dateStr}</span>`;
      const label = diffDays === 0 ? shortLabel : `${shortLabel} ${sub}`;

      const last = groups[groups.length - 1];
      if (last && last.dateKey === key) {
        last.events.push(event);
      } else {
        groups.push({ dateKey: key, label, shortLabel, isToday, events: [event] });
      }
    }
    return groups;
  }
}
