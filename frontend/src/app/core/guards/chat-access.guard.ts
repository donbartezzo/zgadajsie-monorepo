import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ChatService } from '../services/chat.service';

export const chatAccessGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const chatService = inject(ChatService);

  const eventId = route.paramMap.get('id') ?? route.parent?.paramMap.get('id');
  if (!eventId) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return false;
  }

  const currentUser = authService.currentUser();
  if (!currentUser) {
    router.navigate(['/not-found'], { skipLocationChange: true });
    return false;
  }

  return chatService.getMembers(eventId).pipe(
    map((res) => {
      const isOrganizer = res.organizer.id === currentUser.id;

      if (isOrganizer) {
        return true;
      }

      const isMember = res.members.some(
        (member) => member.user.id === currentUser.id && member.isActive,
      );

      if (isMember) {
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
