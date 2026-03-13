import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventCardComponent } from '../../../../shared/ui/event-card/event-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { DateBadgeComponent } from '../../../../shared/ui/date-badge/date-badge.component';
import { EventService } from '../../../../core/services/event.service';
import { EventListItem } from '../../../../shared/types';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';

@Component({
  selector: 'app-events',
  imports: [CommonModule, EventCardComponent, LoadingSpinnerComponent, EmptyStateComponent, DateBadgeComponent, LayoutSlotDirective],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly layoutConfig = inject(LayoutConfigService);
  readonly events = signal<EventListItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cityName = signal('');
  private citySlug = '';
  private page = 1;
  private hasMore = true;

  readonly dateRangeFrom = computed(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase() };
  });

  readonly dateRangeTo = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return { day: d.getDate(), month: d.toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase() };
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

    type EventGroup = {
      dateKey: string;
      label: string;
      isToday: boolean;
      isPast: boolean;
      isOngoing: boolean;
      events: EventListItem[];
    };
    const groups: EventGroup[] = [];

    if (ongoing.length > 0) {
      groups.push({
        dateKey: '__ongoing',
        label: 'Trwające',
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

    const pastByDate = this.groupByDate(past, todayStart);
    for (const g of pastByDate) {
      groups.push({ ...g, isPast: true, isOngoing: false });
    }

    return groups;
  });

  private groupByDate(
    events: EventListItem[],
    todayStart: Date,
  ): { dateKey: string; label: string; isToday: boolean; events: EventListItem[] }[] {
    const groups: { dateKey: string; label: string; isToday: boolean; events: EventListItem[] }[] = [];
    const todayKey = `${todayStart.getFullYear()}-${todayStart.getMonth()}-${todayStart.getDate()}`;

    for (const event of events) {
      const d = new Date(event.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const isToday = key === todayKey;

      const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((eventDay.getTime() - todayStart.getTime()) / 86400000);

      const dateStr = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
      const sub = `<span class="opacity-60 font-normal ml-1">· ${dateStr}</span>`;
      let label: string;
      if (diffDays === 0) {
        label = 'Dziś';
      } else if (diffDays === 1) {
        label = `Jutro ${sub}`;
      } else if (diffDays === 2) {
        label = `Pojutrze ${sub}`;
      } else if (diffDays === 7) {
        label = `Za tydzień ${sub}`;
      } else if (diffDays > 0) {
        label = `Za ${diffDays} dni ${sub}`;
      } else if (diffDays === -1) {
        label = `Wczoraj ${sub}`;
      } else {
        label = `${Math.abs(diffDays)} dni temu ${sub}`;
      }

      const last = groups[groups.length - 1];
      if (last && last.dateKey === key) {
        last.events.push(event);
      } else {
        groups.push({ dateKey: key, label, isToday, events: [event] });
      }
    }
    return groups;
  }

  ngOnInit(): void {
    this.citySlug = this.route.snapshot.paramMap.get('citySlug') ?? '';
    this.layoutConfig.titleText.set('Wydarzenia');
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
        // Set city name from first event if not already set
        if (!this.cityName() && res.data.length > 0) {
          const name = res.data[0].city?.name || '';
          this.cityName.set(name);
          this.layoutConfig.titleText.set(name || 'Wydarzenia');
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
}
