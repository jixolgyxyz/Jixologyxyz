import { test as base, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

const AUTH_STATE_PATH = path.resolve(__dirname, '../.auth/session.json');

async function login(page: Page): Promise<void> {
  const email    = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set in client/.env.e2e'
    );
  }

  await page.goto('/inicio-sesion');
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
  await page.waitForSelector('#email', { timeout: 15_000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/perfil', { timeout: 10_000 });
}

// Global setup helper — call once before all tests to save session to disk
export async function saveAuthSession(page: Page): Promise<void> {
  await login(page);
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATH });
}

export const AUTH_STATE_FILE = AUTH_STATE_PATH;

// Extended test fixture — provides an already-authenticated page
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    const page    = await context.newPage();
    await use(page); // eslint-disable-line react-hooks/rules-of-hooks
    await context.close();
  },
});

export { expect } from '@playwright/test';
