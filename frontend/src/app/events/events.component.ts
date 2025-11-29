// events.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  events: EventItem[] = [
    { id: 1, title: 'Angular Meetup', date: '2025-10-20', location: 'Warszawa' },
    { id: 2, title: 'NestJS Workshop', date: '2025-11-05', location: 'Kraków' },
    { id: 3, title: 'Frontend Fest', date: '2025-12-01', location: 'Online' },
  ];

  trackEventById(index: number, event: EventItem): number {
    return event.id;
  }
}
