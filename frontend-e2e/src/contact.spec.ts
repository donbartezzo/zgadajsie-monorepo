/**
 * E2E: Formularz kontaktowy @smoke
 * Wymaga: działającego frontendu + backendu, klucza Turnstile testowego
 */
import { test, expect } from '@playwright/test';

async function isBackendAvailable(): Promise<boolean> {
  return fetch('http://localhost:3000')
    .then(() => true)
    .catch(() => false);
}

test.describe('Contact - formularz kontaktowy @smoke', () => {
  test('strona /contact renderuje formularz', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#message')).toBeVisible();
  });

  test('wysyłka jako gość wymaga captcha', async ({ page }) => {
    const backendAvailable = await isBackendAvailable();
    test.skip(!backendAvailable, 'Backend niedostępny');

    await page.goto('/contact');

    // Wypełnij formularz
    await page.locator('#name').fill('Jan Kowalski');
    await page.locator('#email').fill('jan@example.com');
    await page.locator('#message').fill('To jest testowa wiadomość kontaktowa.');

    // Sprawdź czy widget captcha jest widoczny (dla niezalogowanego)
    // Zakładamy, że widget ma atrybut data-testid lub klasę
    const captchaWidget = page.locator('[data-testid="turnstile-widget"], .cf-turnstile');
    await expect(captchaWidget).toBeVisible();
  });

  test('wysyłka jako zalogowany pomija captcha i prefills dane', async ({ page }) => {
    const backendAvailable = await isBackendAvailable();
    test.skip(!backendAvailable, 'Backend niedostępny');

    // Zaloguj się (uproszczone - zakładamy istniejące konto testowe)
    await page.goto('/auth/login');
    await page.locator('#login-email').fill(process.env['TEST_USER_EMAIL'] ?? 'test@zgadajsie.pl');
    await page.locator('#login-password').fill(process.env['TEST_USER_PASSWORD'] ?? 'TestPass123!');
    await page.locator('button[type="submit"]').click();

    // Poczekaj na przekierowanie
    await page.waitForURL(/\/(dashboard|w\/)/, { timeout: 10_000 });

    // Przejdź do formularza kontaktowego
    await page.goto('/contact');

    // Sprawdź czy dane są wstępnie wypełnione
    await expect(page.locator('#name')).toHaveValue(/.+/);
    await expect(page.locator('#email')).toHaveValue(/.+/);

    // Sprawdź czy widget captcha NIE jest widoczny
    const captchaWidget = page.locator('[data-testid="turnstile-widget"], .cf-turnstile');
    await expect(captchaWidget).toBeHidden();
  });

  test('trigger kontaktowy na liście wydarzeń miasta', async ({ page }) => {
    await page.goto('/w/warszawa');

    // Sprawdź czy button kontaktowy jest widoczny
    const contactButton = page.locator('text=/Chcesz organizować wydarzenia w tym mieście/i');
    await expect(contactButton).toBeVisible();

    // Kliknij button
    await contactButton.click();

    // Sprawdź czy overlay się otworzył
    const overlay = page.locator('[data-testid="contact-overlay"], .contact-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });
});
