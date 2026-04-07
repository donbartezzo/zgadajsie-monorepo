import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { RuntimeConfig } from '@zgadajsie/shared';

export const eventCreationGuard: CanActivateFn = () => {
  const router = inject(Router);
  const snackbar = inject(SnackbarService);

  if (!RuntimeConfig.isEventCreationEnabled()) {
    snackbar.info(
      'Tworzenie nowych wydarzeń jest tymczasowo wyłączone. Przepraszamy za utrudnienia.',
    );
    router.navigate(['/']);
    return false;
  }

  return true;
};
