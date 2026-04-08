import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Event } from '../../shared/types/event.interface';

export const organizerGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const currentUser = authService.currentUser();
  if (!currentUser) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return false;
  }

  const event = route.data['event'] as Event;
  if (!event) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return false;
  }

  if (event.organizerId === currentUser.id) {
    return true;
  }

  router.navigate(['/not-found'], { skipLocationChange: true });
  return false;
};
