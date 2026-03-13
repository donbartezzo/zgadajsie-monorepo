import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { EventService } from '../services/event.service';
import { Event as EventModel } from '../../shared/types';

export const eventResolver: ResolveFn<EventModel | null> = (route: ActivatedRouteSnapshot) => {
  const eventService = inject(EventService);
  const router = inject(Router);

  const eventId = route.paramMap.get('id');
  const citySlug = route.paramMap.get('citySlug');

  if (!eventId) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return of(null);
  }

  return eventService.getEvent(eventId).pipe(
    map((event) => {
      if (citySlug && event.city?.slug !== citySlug) {
        router.navigate(['/not-found'], {
          skipLocationChange: true,
          state: { reason: 'city-mismatch', citySlug },
        });
        return null;
      }
      return event;
    }),
    catchError(() => {
      router.navigate(['/not-found'], {
        skipLocationChange: true,
        state: { reason: 'event-not-found', citySlug },
      });
      return of(null);
    }),
  );
};
