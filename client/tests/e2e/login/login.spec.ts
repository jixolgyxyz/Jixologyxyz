import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

test.describe('Login', () => {
  test('redirects to dashboard on valid credentials', async ({ page }) => {
    await page.goto('/inicio-sesion');
    await page.fill('#email', process.env.E2E_EMAIL!);
    await page.fill('#password', process.env.E2E_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/perfil', { timeout: 10_000 });
    expect(page.url()).toContain('/perfil');
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/inicio-sesion');
    await page.fill('#email', 'notauser@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    const errorCard = page.locator('.log-in-page__status-card--error');
    await expect(errorCard).toBeVisible({ timeout: 8_000 });
  });

  test('stays on login page when fields are empty', async ({ page }) => {
    await page.goto('/inicio-sesion');
    await page.click('button[type="submit"]');
    expect(page.url()).toContain('/inicio-sesion');
  });
});
