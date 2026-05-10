import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../services/event.service';
import { catchError, map, of } from 'rxjs';
import { NavigationService } from '../services/navigation.service';

export const organizerGuard: CanActivateFn = (route) => {
  const navigation = inject(NavigationService);
  const authService = inject(AuthService);
  const eventService = inject(EventService);

  const currentUser = authService.currentUser();
  if (!currentUser) {
    navigation.navigateToNotFound();
    return of(false);
  }

  const eventId = route.paramMap.get('id');
  if (!eventId) {
    navigation.navigateToNotFound();
    return of(false);
  }

  return eventService.getEvent(eventId).pipe(
    map((event) => {
      if (!event) {
        navigation.navigateToNotFound();
        return false;
      }

      if (event.organizerId === currentUser.id) {
        // Store event in a temporary property for the component to use
        (route as any)._resolvedEvent = event;
        return true;
      }

      navigation.navigateToNotFound();
      return false;
    }),
    catchError(() => {
      navigation.navigateToNotFound();
      return of(false);
    }),
  );
};
