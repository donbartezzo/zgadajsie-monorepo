/**
 * E2E: tworzenie serii wydarzeń przez organizatora
 * Wymaga: zalogowanego użytkownika z aktywną sesją oraz działającego backendu.
 */
import { expect, test } from '@playwright/test';

const HAS_AUTH = Boolean(process.env['TEST_USER_EMAIL'] && process.env['TEST_USER_PASSWORD']);

async function isBackendAvailable(): Promise<boolean> {
  return fetch('http://localhost:3000')
    .then(() => true)
    .catch(() => false);
}

test.describe('Organizer - seria wydarzeń', () => {
  test.beforeEach(async (_args, testInfo) => {
    const backendAvailable = await isBackendAvailable();
    testInfo.skip(!backendAvailable, 'Backend niedostępny');
    testInfo.skip(testInfo.project.name === 'unauthenticated', 'Wymaga zalogowanego użytkownika');
    testInfo.skip(!HAS_AUTH, 'Wymaga TEST_USER_EMAIL i TEST_USER_PASSWORD');
  });

  test('utworzenie serii weekly prowadzi do strony serii', async ({ page }) => {
    const uniqueSuffix = Date.now();
    const title = `Seria E2E ${uniqueSuffix}`;

    await page.goto('/o/w/new?seriesMode=true');
    await expect(page.locator('form')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Utwórz serię' })).toBeVisible();
    await expect(
      page.locator('select[formcontrolname="disciplineSlug"] option[value="football"]'),
    ).toHaveCount(1);

    await page.locator('#title').fill(title);
    await page.locator('input[placeholder="np. Trening środowy"]').fill(title);
    await page.locator('select[formcontrolname="disciplineSlug"]').selectOption('football');
    await page.locator('select[formcontrolname="facilitySlug"]').selectOption('orlik');
    await page.locator('select[formcontrolname="levelSlug"]').selectOption('open');
    await page.locator('select[formcontrolname="citySlug"]').selectOption('zielona-gora');
    await page.locator('input[formcontrolname="address"]').fill('ul. Testowa 1');

    await page.getByRole('button', { name: 'Dni tygodnia' }).click();
    await page.getByRole('button', { name: 'Poniedziałek' }).click();
    await page.getByRole('button', { name: 'Czwartek' }).click();

    await page.getByRole('button', { name: 'Utwórz serię' }).click();

    await expect(page).toHaveURL(/\/series\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title, { timeout: 15_000 });
    await expect(page.getByText('Nadchodzące wydarzenia')).toBeVisible();
  });
});
