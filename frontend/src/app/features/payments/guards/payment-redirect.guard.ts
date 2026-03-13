import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard na route '/' — jeśli URL zawiera ?intentId=..., przekierowuje
 * na /payment/status z zachowaniem query params. W przeciwnym razie przepuszcza.
 */
export const paymentRedirectGuard: CanActivateFn = (route) => {
 const router = inject(Router);
 const intentId = route.queryParamMap.get('intentId');

 if (intentId) {
 return router.createUrlTree(['/payment/status'], {
 queryParams: { intentId },
 });
 }

 return true;
};
