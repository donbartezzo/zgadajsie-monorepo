import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const backendAvailable = await fetch('http://localhost:3000')
    .then(() => true)
    .catch(() => false);
  if (!backendAvailable) {
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto('/auth/login');
  await page.fill('[data-testid="email"]', process.env['TEST_USER_EMAIL'] ?? '');
  await page.fill('[data-testid="password"]', process.env['TEST_USER_PASSWORD'] ?? '');
  await page.click('[data-testid="submit"]', { force: true });
  await page.waitForURL('**/', { timeout: 10000 });
  await page.context().storageState({ path: authFile });
});
