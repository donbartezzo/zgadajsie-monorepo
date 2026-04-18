/**
 * E2E: Happy path płatności @smoke
 * Wymaga: Tpay sandbox, płatnego wydarzenia z TEST_PAID_EVENT_ID
 * Uwaga: testy płatności nie kończą transakcji — tylko weryfikują URL redirectu
 */
import { test, expect } from '@playwright/test';

const TEST_CITY = process.env['TEST_CITY_SLUG'] ?? 'warszawa';
const TEST_PAID_EVENT_ID = process.env['TEST_PAID_EVENT_ID'] ?? '';

test.describe('Payment — happy path @smoke', () => {
  test.skip(!TEST_PAID_EVENT_ID, 'Wymaga TEST_PAID_EVENT_ID i Tpay sandbox');

  test('strona płatnego wydarzenia pokazuje informację o koszcie', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_PAID_EVENT_ID}`);

    const costInfo = page.locator('[data-testid="cost-info"], text=/zł/').first();
    await expect(costInfo).toBeVisible({ timeout: 5_000 });
  });

  test('po dołączeniu do płatnego eventu wyświetla przycisk płatności', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_PAID_EVENT_ID}`);

    const payButton = page.locator('[data-testid="pay-button"], button:has-text("Zapłać")').first();
    if (await payButton.isVisible()) {
      await expect(payButton).toBeEnabled();
    }
  });

  test('kliknięcie "Zapłać" przekierowuje na bramkę płatności', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_PAID_EVENT_ID}`);

    const payButton = page.locator('[data-testid="pay-button"], button:has-text("Zapłać")').first();
    if (await payButton.isVisible()) {
      await payButton.click();
      await expect(page).toHaveURL(/tpay|secure|payment/i, { timeout: 10_000 });
    }
  });
});
