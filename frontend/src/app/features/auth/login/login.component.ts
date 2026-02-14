import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { LoginFormComponent } from './login-form.component';

@Component({
  selector: 'app-login',
  imports: [CardComponent, LoginFormComponent],
  template: `
    <div class="py-8">
      <app-card>
        <div class="p-6">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Zaloguj się
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Witaj ponownie w ZgadajSię
            </p>
          </div>

          <app-login-form (authenticated)="onAuthenticated()"></app-login-form>
        </div>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['accessToken'] && params['refreshToken']) {
      this.auth
        .handleSocialCallback(params['accessToken'], params['refreshToken'])
        .then(() => {
          this.snackbar.success('Zalogowano pomyślnie');
          this.router.navigateByUrl('/');
        });
    }
  }

  onAuthenticated(): void {
    this.router.navigateByUrl('/');
  }
}
