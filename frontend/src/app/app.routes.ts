import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { EventsComponent } from './events/events.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
];
