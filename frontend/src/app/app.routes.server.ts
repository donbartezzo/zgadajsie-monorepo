import { RenderMode, ServerRoute } from '@angular/ssr';
import { EventsComponent } from './features/events/events.component';
import { HomeComponent } from './features/home/home.component';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
