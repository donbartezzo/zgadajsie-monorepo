import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { EventService } from '../services/event.service';

export const organizerGuard: CanActivateFn = (route) => {
 const router = inject(Router);
 const eventService = inject(EventService);

 const eventId = route.paramMap.get('id') ?? route.parent?.paramMap.get('id');

 if (!eventId) {
 router.navigate(['/not-found'], { skipLocationChange: true });
 return false;
 }

 return eventService.getEvent(eventId).pipe(
 map((event) => {
 if (event?.currentUserAccess?.isOrganizer) {
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
