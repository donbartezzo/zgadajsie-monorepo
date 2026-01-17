// events.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { EventItemComponent } from './event-item.component';

interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
  attendeesCount: number;
}

@Component({
  selector: 'app-events',
  imports: [EventItemComponent],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  constructor(private readonly router: Router) {}

  events: EventItem[] = [
    {
      id: 1,
      title: 'Paintball at the Park',
      date: '28 August 2025 - 09:00 AM',
      location: 'Area 51, Nevada',
      attendeesCount: 135,
    },
    {
      id: 2,
      title: 'Typopgrahy Exposition',
      date: '28 August 2025 - 09:00 AM',
      location: 'New York, Manahttan',
      attendeesCount: 135,
    },
    {
      id: 3,
      title: 'Apple Watch Event',
      date: '28 August 2025 - 09:00 AM',
      location: 'Palo Alto, California',
      attendeesCount: 135,
    },
  ];

  trackEventById(index: number, event: EventItem): number {
    return event.id;
  }

  onEventSelected(event: EventItem): void {
    this.router.navigate(['/event', event.id]);
  }
}
