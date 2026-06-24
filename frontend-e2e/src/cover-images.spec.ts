/**
 * E2E: Cover images organizatora (galeria własna + integracja z event-form).
 *
 * Zakres świadomie ograniczony do ścieżek UI deterministycznych:
 *  - nawigacja i widoczność galerii własnej,
 *  - otwarcie file chooser z dynamicznie tworzonego <input type="file">,
 *  - walidacja w cropperze (za mały obraz / plik nie-obraz) z czytelnym komunikatem,
 *  - zakładki "Galeria publiczna"/"Galeria własna" w event-form i walidacja wymaganego covera.
 *
 * Realny upload przez ngx-image-cropper (canvas) + zapis do R2 NIE jest testowany w E2E
 * (kruche interakcje canvas + zewnętrzny storage). Tę warstwę pokrywają testy backendu
 * `cover-images.service.spec.ts` oraz testy jednostkowe komponentów.
 */
import { test, expect, Page } from '@playwright/test';

const GALLERY_ROUTE = '/profile/organizer/cover-images';

// 1x1 PNG (poprawny obraz, ale < 700x250 → cropper odrzuca jako za mały).
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Nagłówek PDF - plik nie-obraz: new Image() w cropperze nie wczyta go → komunikat walidacji.
const FAKE_PDF = Buffer.from('%PDF-1.4\n%fake pdf for e2e\n', 'utf-8');

function tinyPngBuffer(): Buffer {
  return Buffer.from(TINY_PNG_BASE64, 'base64');
}

async function skipIfNoBackend(testInfo: { skip: (cond: boolean, reason: string) => void }) {
  const backendAvailable = await fetch('http://localhost:3000')
    .then(() => true)
    .catch(() => false);
  testInfo.skip(!backendAvailable, 'Backend niedostępny');
}

async function selectFileViaChooser(
  page: Page,
  triggerSelector: string,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator(triggerSelector).first().click(),
  ]);
  await chooser.setFiles([file]);
}

test.describe('Cover images - galeria własna organizatora', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    await skipIfNoBackend(testInfo);
    testInfo.skip(testInfo.project.name === 'unauthenticated', 'Wymaga zalogowanego użytkownika');
  });

  test('galeria własna ładuje się i pokazuje przycisk dodawania', async ({ page }) => {
    await page.goto(GALLERY_ROUTE);

    await expect(page.getByRole('heading', { name: 'Moja galeria cover images' })).toBeVisible({
      timeout: 5_000,
    });
    // Przy < limit własnych coverów przycisk dodawania jest dostępny.
    await expect(page.getByRole('button', { name: 'Dodaj nowe cover image' })).toBeVisible();
  });

  test('za mały obraz jest odrzucany z czytelnym komunikatem w cropperze', async ({ page }) => {
    await page.goto(GALLERY_ROUTE);
    await expect(page.getByRole('button', { name: 'Dodaj nowe cover image' })).toBeVisible({
      timeout: 5_000,
    });

    await selectFileViaChooser(page, 'button:has-text("Dodaj nowe cover image")', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: tinyPngBuffer(),
    });

    // Host <app-image-cropper-modal> ma dziecko position:fixed (zerowa wysokość hosta),
    // więc asertujemy na widocznej treści, nie na hoście.
    await expect(page.getByText('Obrazek jest za mały do przycięcia')).toBeVisible({
      timeout: 5_000,
    });
    // Przycisk zatwierdzenia musi być zablokowany przy błędzie walidacji.
    await expect(page.getByRole('button', { name: 'Zatwierdź' })).toBeDisabled();
  });

  test('plik nie-obraz (pdf) nie przechodzi walidacji cropperu', async ({ page }) => {
    await page.goto(GALLERY_ROUTE);
    await expect(page.getByRole('button', { name: 'Dodaj nowe cover image' })).toBeVisible({
      timeout: 5_000,
    });

    await selectFileViaChooser(page, 'button:has-text("Dodaj nowe cover image")', {
      name: 'fake.pdf',
      mimeType: 'application/pdf',
      buffer: FAKE_PDF,
    });

    // new Image() nie wczyta PDF → onerror → komunikat o nieprawidłowych wymiarach.
    await expect(page.getByText('Obrazek jest za mały do przycięcia')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: 'Zatwierdź' })).toBeDisabled();
  });
});

test.describe('Cover images - integracja z event-form', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    await skipIfNoBackend(testInfo);
    testInfo.skip(testInfo.project.name === 'unauthenticated', 'Wymaga zalogowanego użytkownika');
  });

  // Logika domyślnej zakładki i walidacja wymaganego covera są pokryte testami jednostkowymi
  // (event-form.component.spec.ts). Tutaj weryfikujemy tylko deterministyczny punkt wejścia UI:
  // formularz tworzenia wydarzenia z selektorem dyscypliny (bramka sekcji cover image).
  test('formularz tworzenia wydarzenia renderuje selektor dyscypliny', async ({ page }) => {
    await page.goto('/o/w/new');
    await expect(page.locator('form')).toBeVisible({ timeout: 5_000 });

    const disciplineSelect = page.locator('select[formcontrolname="disciplineSlug"]');
    await expect(disciplineSelect).toBeVisible();
    await expect(disciplineSelect.locator('option')).not.toHaveCount(0);

    // Wybór dyscypliny nie wyrzuca z formularza (sekcja cover ładuje się asynchronicznie).
    await disciplineSelect.selectOption({ index: 1 });
    await expect(page).toHaveURL(/\/o\/w\/new/);
    await expect(page.locator('form')).toBeVisible();
  });
});

test.describe('Cover images - dostęp', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    testInfo.skip(
      testInfo.project.name !== 'unauthenticated',
      'Test dla niezalogowanego użytkownika',
    );
  });

  test('niezalogowany użytkownik jest przekierowany z galerii własnej na logowanie', async ({
    page,
  }) => {
    await page.goto(GALLERY_ROUTE);
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5_000 });
  });
});
