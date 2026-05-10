import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { AuthService } from '../auth/auth.service';
import { isOverrideAccount } from '@zgadajsie/shared';
import { environment } from '../../../environments/environment';
import { NavigationService } from '../services/navigation.service';

export const eventCreationGuard: CanActivateFn = () => {
  const navigation = inject(NavigationService);
  const snackbar = inject(SnackbarService);
  const authService = inject(AuthService);

  const userEmail = authService.currentUser()?.email;
  if (!environment.enableEventCreation && !isOverrideAccount(userEmail)) {
    snackbar.info(
      'Tworzenie nowych wydarzeń jest tymczasowo wyłączone. Przepraszamy za utrudnienia.',
    );
    navigation.navigateToRoot();
    return false;
  }

  return true;
};
