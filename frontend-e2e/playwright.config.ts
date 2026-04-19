import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { E2E_SEED } from '../backend/prisma/e2e-constants';

// Load environment overrides from .env.test.e2e (optional — only for CI or local overrides)
const envPath = path.join(workspaceRoot, '.env.test.e2e');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

// Defaults from seed constants — single source of truth with backend/prisma/e2e-constants.ts
process.env['TEST_USER_EMAIL'] ??= E2E_SEED.user.email;
process.env['TEST_USER_PASSWORD'] ??= E2E_SEED.user.password;
process.env['TEST_CITY_SLUG'] ??= E2E_SEED.city;
process.env['TEST_EVENT_ID'] ??= E2E_SEED.events.enrollment;
process.env['TEST_ORGANIZER_EVENT_ID'] ??= E2E_SEED.events.organizer;
process.env['TEST_CHAT_EVENT_ID'] ??= E2E_SEED.events.chat;
process.env['TEST_PAID_EVENT_ID'] ??= E2E_SEED.events.paid;

const baseURL = process.env['BASE_URL'] || 'http://localhost:4300';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm exec nx run frontend:serve',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
