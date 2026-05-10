import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Event as EventModel } from '../../shared/types';
import { EventService } from '../services/event.service';
import { NavigationService } from '../services/navigation.service';

export const eventResolver: ResolveFn<EventModel | null> = (route: ActivatedRouteSnapshot) => {
  const eventService = inject(EventService);
  const navigation = inject(NavigationService);

  const eventId = route.paramMap.get('id');
  const citySlug = route.paramMap.get('citySlug');

  if (!eventId) {
    navigation.navigateToNotFound();
    return of(null);
  }

  return eventService.getEvent(eventId).pipe(
    map((event) => {
      if (citySlug && event.city?.slug !== citySlug) {
        navigation.navigateToNotFoundWithReason('city-mismatch');
        return null;
      }
      return event;
    }),
    catchError(() => {
      navigation.navigateToNotFoundWithReason('event-not-found');
      return of(null);
    }),
  );
};
