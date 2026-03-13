import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const activeGuard: CanActivateFn = () => {
 const authService = inject(AuthService);
 const router = inject(Router);

 if (authService.isActive()) {
 return true;
 }

 return router.createUrlTree(['/profile']);
};
