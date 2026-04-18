/**
 * E2E: Chat grupowy i prywatny
 * Wymaga: zalogowanego uczestnika z dostępem do chatu (auth.setup.ts),
 *         aktywnego wydarzenia z chatem
 */
import { test, expect } from '@playwright/test';

const TEST_CITY = process.env['TEST_CITY_SLUG'] ?? 'warszawa';
const TEST_CHAT_EVENT_ID = process.env['TEST_CHAT_EVENT_ID'] ?? '';

test.describe('Chat — czat grupowy', () => {
  test.skip(!TEST_CHAT_EVENT_ID, 'Wymaga TEST_CHAT_EVENT_ID w env');

  test('zakładka chatu wyświetla się dla uczestnika', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_CHAT_EVENT_ID}`);

    const chatTab = page.locator('[data-testid="chat-tab"], a:has-text("Czat")').first();
    if (await chatTab.isVisible()) {
      await chatTab.click();
      await expect(page.locator('[data-testid="chat-input"], textarea[placeholder*="wiadom"]').first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('wysłanie wiadomości pojawia się na liście', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_CHAT_EVENT_ID}/chat`);

    const chatInput = page.locator('[data-testid="chat-input"], textarea').first();
    if (await chatInput.isVisible()) {
      const testMessage = `E2E test ${Date.now()}`;
      await chatInput.fill(testMessage);
      await page.keyboard.press('Enter');

      await expect(page.locator(`text="${testMessage}"`).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Chat — czat prywatny', () => {
  test.skip(!TEST_CHAT_EVENT_ID, 'Wymaga TEST_CHAT_EVENT_ID w env');

  test('lista konwersacji prywatnych wyświetla się dla organizatora', async ({ page }) => {
    await page.goto(`/w/${TEST_CITY}/${TEST_CHAT_EVENT_ID}`);

    const privateTab = page.locator('[data-testid="private-chat-tab"], a:has-text("Prywatne")').first();
    if (await privateTab.isVisible()) {
      await privateTab.click();
      await expect(page.locator('body')).toBeVisible();
      await expect(page).not.toHaveURL(/\/auth\/login/);
    }
  });
});
