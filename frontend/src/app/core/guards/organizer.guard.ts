import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../services/event.service';
import { catchError, map, of } from 'rxjs';

export const organizerGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const eventService = inject(EventService);

  const currentUser = authService.currentUser();
  if (!currentUser) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return of(false);
  }

  const eventId = route.paramMap.get('id');
  if (!eventId) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return of(false);
  }

  return eventService.getEvent(eventId).pipe(
    map((event) => {
      if (!event) {
        router.navigate(['/not-found'], { skipLocationChange: true });
        return false;
      }

      if (event.organizerId === currentUser.id) {
        // Store event in a temporary property for the component to use
        (route as any)._resolvedEvent = event;
        return true;
      }

      router.navigate(['/not-found'], { skipLocationChange: true });
      return false;
    }),
    catchError(() => {
      router.navigate(['/not-found'], { skipLocationChange: true });
      return of(false);
    }),
  );
};
