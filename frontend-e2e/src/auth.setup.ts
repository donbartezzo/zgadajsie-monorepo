import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.goto('/auth/login');
  await page.fill('[data-testid="email"]', process.env['TEST_USER_EMAIL'] ?? '');
  await page.fill('[data-testid="password"]', process.env['TEST_USER_PASSWORD'] ?? '');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.context().storageState({ path: authFile });
});
