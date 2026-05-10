import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { NavigationService } from '../services/navigation.service';

export const activeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const navigation = inject(NavigationService);

  if (authService.isActive()) {
    return true;
  }

  return navigation.createUrlTree(['/profile']);
};
