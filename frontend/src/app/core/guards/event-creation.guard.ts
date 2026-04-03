import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TEMPORARY_CONFIG } from '../../config/temporary-config';

export const eventCreationGuard: CanActivateFn = () => {
  const router = inject(Router);
  const snackbar = inject(SnackbarService);
  const authService = inject(AuthService);

  // Sprawdź flagę globalną
  if (!environment.enableEventCreation) {
    // Sprawdź czy to uprawniony użytkownik (wyjątek)
    const currentUser = authService.currentUser();
    const isExemptUser = currentUser?.email === TEMPORARY_CONFIG.exemptEmailFromEventCreationBlock;

    if (!isExemptUser) {
      // Pokaż komunikat i przekieruj na stronę główną
      snackbar.info(
        'Tworzenie nowych wydarzeń jest tymczasowo wyłączone. Przepraszamy za utrudnienia.',
      );
      router.navigate(['/']);
      return false;
    }
  }

  return true;
};
