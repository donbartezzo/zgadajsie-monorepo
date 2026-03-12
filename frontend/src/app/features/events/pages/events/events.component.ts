import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventCardComponent } from '../../../../shared/ui/event-card/event-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { EventService } from '../../../../core/services/event.service';
import { EventListItem } from '../../../../shared/types';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';

@Component({
  selector: 'app-events',
  imports: [CommonModule, EventCardComponent, LoadingSpinnerComponent, EmptyStateComponent, LayoutSlotDirective],
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
