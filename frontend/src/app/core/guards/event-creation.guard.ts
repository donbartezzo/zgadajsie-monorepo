import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { AuthService } from '../auth/auth.service';
import { isOverrideAccount } from '@zgadajsie/shared';
import { environment } from '../../../environments/environment';

export const eventCreationGuard: CanActivateFn = () => {
  const router = inject(Router);
  const snackbar = inject(SnackbarService);
  const authService = inject(AuthService);

  const userEmail = authService.currentUser()?.email;
  if (!environment.enableEventCreation && !isOverrideAccount(userEmail)) {
    snackbar.info(
      'Tworzenie nowych wydarzeń jest tymczasowo wyłączone. Przepraszamy za utrudnienia.',
    );
    router.navigate(['/']);
    return false;
  }

  return true;
};
