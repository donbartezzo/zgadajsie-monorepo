import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventCardComponent } from '../../../../shared/ui/event-card/event-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { EventService } from '../../../../core/services/event.service';
import { EventListItem } from '../../../../shared/types';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';

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
  readonly events = signal<EventListItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private citySlug = '';
  private page = 1;
  private hasMore = true;

  ngOnInit(): void {
    this.citySlug = this.route.snapshot.paramMap.get('citySlug') ?? '';
    this.loadEvents();
  }

  loadEvents(): void {
    if (!this.hasMore) return;
    this.eventService
      .getEvents({ page: this.page, limit: 20, sortBy: 'startsAt', citySlug: this.citySlug })
      .subscribe({
      next: (res) => {
        this.events.update((prev) => [...prev, ...res.data]);
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
