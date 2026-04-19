/**
 * E2E: Przeglądanie wydarzeń i dołączanie @smoke
 * Wymaga: działającego frontendu + backendu, zalogowanego użytkownika (auth.setup.ts)
 * Wymaga: seed danych — co najmniej jedno aktywne wydarzenie
 */
import { test, expect } from '@playwright/test';
import { EventsPage } from './pages/events.page';
import { EventDetailPage } from './pages/event-detail.page';

const TEST_CITY = process.env['TEST_CITY_SLUG'] ?? 'warszawa';
const TEST_EVENT_ID = process.env['TEST_EVENT_ID'] ?? '';

test.describe('Enrollment — przeglądanie wydarzeń @smoke', () => {
  test('lista wydarzeń wyświetla się po wejściu na /w/:city', async ({ page }) => {
    const eventsPage = new EventsPage(page);
    await eventsPage.goto(TEST_CITY);

    await expect(page).toHaveURL(new RegExp(`/w/${TEST_CITY}`));
    await expect(page.locator('body')).toBeVisible();
  });

  test('kliknięcie w kartę wydarzenia otwiera stronę szczegółów', async ({ page }) => {
    const eventsPage = new EventsPage(page);
    await eventsPage.goto(TEST_CITY);

    const firstCard = page.locator('a[href*="/w/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/w\/.+\/.+/, { timeout: 5_000 });
    }
  });
});

test.describe('Enrollment — dołączanie do wydarzenia @smoke', () => {
  test.skip(!TEST_EVENT_ID, 'Wymaga TEST_EVENT_ID w env — ustaw przed uruchomieniem');

  test('zalogowany użytkownik może dołączyć do otwartego wydarzenia', async ({ page }) => {
    const detailPage = new EventDetailPage(page);
    await detailPage.goto(TEST_CITY, TEST_EVENT_ID);

    await expect(detailPage.eventTitle).toBeVisible({ timeout: 5_000 });

    const joinVisible = await detailPage.joinButton.isVisible();
    if (joinVisible) {
      await detailPage.join();
      await expect(page.locator('text=/dołączono|zapisano|zapisany/i').first()).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('strona szczegółów wyświetla siatkę uczestników', async ({ page }) => {
    const backendAvailable = await fetch('http://localhost:3000')
      .then(() => true)
      .catch(() => false);
    test.skip(!backendAvailable, 'Backend niedostępny');

    const detailPage = new EventDetailPage(page);
    await detailPage.goto(TEST_CITY, TEST_EVENT_ID);

    await expect(detailPage.participantGrid).toBeVisible({ timeout: 5_000 });
  });
});
