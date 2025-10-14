// events.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent {
  events: EventItem[] = [
    { id: 1, title: 'Angular Meetup', date: '2025-10-20', location: 'Warszawa' },
    { id: 2, title: 'NestJS Workshop', date: '2025-11-05', location: 'Kraków' },
    { id: 3, title: 'Frontend Fest', date: '2025-12-01', location: 'Online' },
  ];
}
