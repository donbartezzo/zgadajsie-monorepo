import { Route } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EventsComponent } from './features/events/events.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
];
