import { chromium } from '@playwright/test';
import { saveAuthSession } from './fixtures/auth.fixture.js';

// Runs once before all test files — logs in and saves the session to disk
// so individual test files can reuse it without logging in every time.
async function globalSetup() {
  const browser = await chromium.launch();
  const page    = await browser.newPage({ baseURL: 'http://localhost:5173' });
  await saveAuthSession(page);
  await browser.close();
}

export default globalSetup;
