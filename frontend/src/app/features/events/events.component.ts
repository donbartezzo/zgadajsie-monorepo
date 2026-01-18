import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventItemComponent } from './event-item.component';
import { EventService, EventListItem } from '../event/event.service';
import { toSignal } from '@angular/core/rxjs-interop';

interface EventItem extends EventListItem {}

// @theme: page-events-category-tabs.html -> Recommended tab
@Component({
  selector: 'app-events',
  imports: [CommonModule, EventItemComponent],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly events$ = this.eventService.getAllEvents();
  readonly events = toSignal(this.events$, {
    initialValue: [] as EventItem[],
  });

  constructor() {
    this.events$.subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.error.set('Failed to load events');
        this.isLoading.set(false);
      },
    });
  }

  trackEventById(index: number, event: EventItem): string {
    return event.id;
  }

  onEventSelected(event: EventItem): void {
    this.router.navigate(['/event', event.id]);
  }
}
