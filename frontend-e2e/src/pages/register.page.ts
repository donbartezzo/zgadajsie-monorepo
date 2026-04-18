import { type Page, type Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly displayNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.displayNameInput = page.locator('#displayName, [data-testid="displayName"]').first();
    this.emailInput = page.locator('#email, [data-testid="email"]').first();
    this.passwordInput = page.locator('#password, [data-testid="password"]').first();
    this.confirmPasswordInput = page.locator('#confirmPassword, [data-testid="confirmPassword"]').first();
    this.submitButton = page.locator('[data-testid="submit"], button[type="submit"]').first();
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async register(displayName: string, email: string, password: string) {
    await this.displayNameInput.fill(displayName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }
}
