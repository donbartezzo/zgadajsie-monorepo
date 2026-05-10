import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ChatService } from '../services/chat.service';
import { NavigationService } from '../services/navigation.service';

export const chatAccessGuard: CanActivateFn = (route) => {
  const navigation = inject(NavigationService);
  const authService = inject(AuthService);
  const chatService = inject(ChatService);

  const eventId = route.paramMap.get('id') ?? route.parent?.paramMap.get('id');
  if (!eventId) {
    navigation.navigateToNotFound();
    return false;
  }

  const currentUser = authService.currentUser();
  if (!currentUser) {
    navigation.navigateToNotFound();
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

      navigation.navigateToNotFound();
      return false;
    }),
    catchError(() => {
      navigation.navigateToNotFound();
      return of(false);
    }),
  );
};
