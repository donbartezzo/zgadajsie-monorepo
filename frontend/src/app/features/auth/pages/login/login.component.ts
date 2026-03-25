import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { LoginFormComponent } from '../../../../shared/auth/ui/login-form/login-form.component';
import { APP_BRAND } from '@zgadajsie/shared';

@Component({
  selector: 'app-login',
  imports: [LoginFormComponent],
  template: `
    <div class="p-6 max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-neutral-900">Zaloguj się</h1>
        <p class="mt-1 text-sm text-neutral-500">Witaj ponownie w {{ APP_BRAND.SHORT_NAME }}</p>
      </div>

      <app-login-form (authenticated)="onAuthenticated()"></app-login-form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  protected readonly APP_BRAND = APP_BRAND;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['accessToken'] && params['refreshToken']) {
      this.auth.handleSocialCallback(params['accessToken'], params['refreshToken']).then(() => {
        this.snackbar.success('Zalogowano pomyślnie');
        this.redirectBack();
      });
    }
  }

  onAuthenticated(): void {
    this.redirectBack();
  }

  private redirectBack(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.router.navigateByUrl(returnUrl);
  }
}
