import { Route } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EventsComponent } from './features/events/events.component';
import { EventComponent } from './features/event/event.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'event/:id', component: EventComponent },
];
