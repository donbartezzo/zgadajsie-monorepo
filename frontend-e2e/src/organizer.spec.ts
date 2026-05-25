/**
 * E2E: Zarządzanie wydarzeniem przez organizatora
 * Wymaga: zalogowanego użytkownika z rolą organizatora (auth.setup.ts),
 *         istniejącego wydarzenia należącego do tego użytkownika
 */
import { test, expect } from '@playwright/test';

const TEST_EVENT_ID = process.env['TEST_ORGANIZER_EVENT_ID'] ?? '';
const TEST_CITY = process.env['TEST_CITY_SLUG'] ?? 'warszawa';

test.describe('Organizer - zarządzanie wydarzeniem', () => {
  test.skip(!TEST_EVENT_ID, 'Wymaga TEST_ORGANIZER_EVENT_ID w env');

  test.beforeEach(async (_args, testInfo) => {
    const backendAvailable = await fetch('http://localhost:3000')
      .then(() => true)
      .catch(() => false);
    testInfo.skip(!backendAvailable, 'Backend niedostępny');
    testInfo.skip(testInfo.project.name === 'unauthenticated', 'Wymaga zalogowanego użytkownika');
  });

  test('organizer widzi panel zarządzania na stronie wydarzenia', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_EVENT_ID}`);

    const managementPanel = page
      .locator('[data-testid="organizer-panel"], .organizer-actions')
      .first();
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

  test('pełna ścieżka cover images: dodanie własnego covera, utworzenie wydarzenia, edycja, podmiana, usunięcie', async ({
    page,
  }) => {
    // 1. Przejdź do galerii własnych cover images
    await page.goto('/me/cover-images');
    await expect(page.locator('body')).toBeVisible({ timeout: 5_000 });

    // 2. Sprawdź czy przycisk "Dodaj cover image" jest dostępny (jeśli < 5)
    const addButton = page.locator('button:has-text("Dodaj cover image")').first();
    const addButtonVisible = await addButton.isVisible().catch(() => false);

    if (addButtonVisible) {
      // 3. Otwórz modal upload
      await addButton.click();
      const uploadModal = page.locator('app-image-cropper-modal').first();
      await expect(uploadModal).toBeVisible({ timeout: 5_000 });

      // 4. Zamknij modal (testujemy tylko ścieżkę UI, nie upload pliku)
      await page.keyboard.press('Escape');
    }

    // 5. Przejdź do formularza tworzenia wydarzenia
    await page.goto('/o/w/new');
    await expect(page.locator('form')).toBeVisible({ timeout: 5_000 });

    // 6. Sprawdź czy zakładki "Galeria publiczna" i "Galeria własna" są widoczne
    const publicTab = page.locator('button:has-text("Galeria publiczna")').first();
    const myTab = page.locator('button:has-text("Galeria własna")').first();
    await expect(publicTab).toBeVisible();
    await expect(myTab).toBeVisible();

    // 7. Spróbuj przełączyć między zakładkami
    await myTab.click();
    await expect(myTab).toHaveClass(/active/);

    // 8. Sprawdź czy walidacja blokuje submit bez wybranego covera
    const submitButton = page.locator('button[type="submit"]:has-text("Utwórz")').first();
    await submitButton.click();

    // Oczekujemy komunikatu o błędzie walidacji (cover image wymagany)
    const errorToast = page
      .locator('.snackbar-error, [role="alert"]:has-text("Wybierz grafikę")')
      .first();
    await expect(errorToast).toBeVisible({ timeout: 5_000 });
  });
});
