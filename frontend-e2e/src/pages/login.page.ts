import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login-email, [data-testid="email"]').first();
    this.passwordInput = page.locator('#login-password, [data-testid="password"]').first();
    this.submitButton = page.locator('[data-testid="submit"], button[type="submit"]').first();
    this.errorMessage = page.locator('[data-testid="error"], .snackbar-error').first();
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
