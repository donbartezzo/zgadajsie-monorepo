import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { NavigationService } from '../services/navigation.service';

export const verifiedUserGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const navigation = inject(NavigationService);

  if (!authService.isLoggedIn()) {
    return navigation.createUrlTree(['/auth/login'], { returnUrl: state.url });
  }

  if (!authService.isActive()) {
    navigation.navigateToUnverified();
    return false;
  }

  return true;
};
