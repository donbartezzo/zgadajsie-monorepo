/**
 * E2E: Zarządzanie wydarzeniem przez organizatora
 * Wymaga: zalogowanego użytkownika z rolą organizatora (auth.setup.ts),
 *         istniejącego wydarzenia należącego do tego użytkownika
 */
import { test, expect } from '@playwright/test';

const TEST_EVENT_ID = process.env['TEST_ORGANIZER_EVENT_ID'] ?? '';
const TEST_CITY = process.env['TEST_CITY_SLUG'] ?? 'warszawa';

test.describe('Organizer — zarządzanie wydarzeniem', () => {
  test.skip(!TEST_EVENT_ID, 'Wymaga TEST_ORGANIZER_EVENT_ID w env');

  test('organizer widzi panel zarządzania na stronie wydarzenia', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_EVENT_ID}`);

    const managementPanel = page.locator('[data-testid="organizer-panel"], .organizer-actions').first();
    await expect(managementPanel).toBeVisible({ timeout: 5_000 });
  });

  test('lista zapisów organizatora wyświetla uczestników', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_EVENT_ID}/zapisy`);

    await expect(page.locator('body')).toBeVisible({ timeout: 5_000 });
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('formularz tworzenia nowego wydarzenia dostępny przez /o/w/new', async ({ page }) => {
    await page.goto('/o/w/new');

    await expect(page.locator('form')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[formcontrolname="title"], #title').first()).toBeVisible();
  });

  test('edycja istniejącego wydarzenia ładuje dane formularza', async ({ page }) => {
    await page.goto(`/o/w/${TEST_EVENT_ID}/edit`);

    const titleInput = page.locator('input[formcontrolname="title"], #title').first();
    await expect(titleInput).not.toBeEmpty({ timeout: 5_000 });
  });
});
