/**
 * E2E: Rejestracja i logowanie @smoke
 * Wymaga: działającego frontendu + backendu, kont testowych z env
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';

const TEST_USER_EMAIL = process.env['TEST_USER_EMAIL'] ?? 'test@zgadajsie.pl';
const TEST_USER_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? 'TestPass123!';

async function isBackendAvailable(): Promise<boolean> {
  return fetch('http://localhost:3000')
    .then(() => true)
    .catch(() => false);
}

test.describe('Auth — logowanie @smoke', () => {
  test('poprawne logowanie przekierowuje na stronę główną', async ({ page }) => {
    const backendAvailable = await isBackendAvailable();
    test.skip(!backendAvailable, 'Backend niedostępny');

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);

    await expect(page).toHaveURL(/\/(dashboard|w\/)/, { timeout: 10_000 });
  });

  test('błędne hasło pokazuje komunikat błędu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(TEST_USER_EMAIL, 'wrong-password');

    await expect(page.locator('text=/nieprawidłowe|błąd|error/i').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('strona logowania renderuje formularz', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});

test.describe('Auth — rejestracja @smoke', () => {
  const uniqueSuffix = Date.now();
  const newEmail = `e2e_test_${uniqueSuffix}@test.zgadajsie.pl`;

  test('renderuje formularz rejestracji', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await expect(registerPage.displayNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
  });

  test('poprawna rejestracja przekierowuje na stronę logowania', async ({ page }) => {
    const backendAvailable = await isBackendAvailable();
    test.skip(!backendAvailable, 'Backend niedostępny');

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.register(`E2E User ${uniqueSuffix}`, newEmail, 'SecurePass123!');

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test('niezgodne hasła pokazują komunikat błędu', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.page
      .locator('#displayName, [data-testid="displayName"]')
      .first()
      .fill('Test');
    await registerPage.page
      .locator('#email, [data-testid="email"]')
      .first()
      .fill(`mismatch_${uniqueSuffix}@test.pl`);
    await registerPage.page.locator('#password, [data-testid="password"]').first().fill('Pass123!');
    await registerPage.page
      .locator('#confirmPassword, [data-testid="confirmPassword"]')
      .first()
      .fill('Different!');
    await registerPage.submitButton.click({ force: true });

    await expect(page.locator('text=/identyczne|zgodne|mismatch/i').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
