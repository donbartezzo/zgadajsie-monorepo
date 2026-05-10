import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { NavigationService } from '../../../core/services/navigation.service';

/**
 * Guard na route '/' - jeśli URL zawiera ?intentId=..., przekierowuje
 * na /payment/status z zachowaniem query params. W przeciwnym razie przepuszcza.
 */
export const paymentRedirectGuard: CanActivateFn = (route) => {
  const navigation = inject(NavigationService);
  const intentId = route.queryParamMap.get('intentId');

  if (intentId) {
    return navigation.createUrlTree(['/payment/status'], { intentId });
  }

  return true;
};
