import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventCardComponent } from '../../../../shared/ui/event-card/event-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { EventService } from '../../../../core/services/event.service';
import { EventListItem } from '../../../../shared/types';

@Component({
  selector: 'app-events',
  imports: [CommonModule, EventCardComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);

  readonly events = signal<EventListItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private page = 1;
  private hasMore = true;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    if (!this.hasMore) return;
    this.eventService.getEvents({ page: this.page, limit: 20, sortBy: 'startsAt' }).subscribe({
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
    this.router.navigate(['/events', event.id]);
  }

  onScroll(): void {
    if (!this.isLoading() && this.hasMore) {
      this.loadEvents();
    }
  }
}
