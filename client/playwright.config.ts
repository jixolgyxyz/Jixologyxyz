import { defineConfig } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load E2E settings so config-level options can use them. E2E_TESTER_NAME is
// stamped into the HTML report metadata so a shared report is attributable.
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const testerName = process.env.E2E_TESTER_NAME?.trim() || 'Desconocido';
const runStamp   = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global.setup.ts',
  fullyParallel: false,
  retries: 1,
  // Windows ephemeral-port pool fills up fast when many browser contexts hit
  // localhost (Vite + Supabase) in parallel, causing ERR_NO_BUFFER_SPACE on
  // dashboard tests. One worker on Windows keeps socket pressure manageable;
  // other platforms can scale freely.
  workers: process.platform === 'win32' ? 1 : undefined,
  // Shown in the HTML report's "Metadata" panel — identifies who ran the suite.
  // Playwright only renders the `ci` / `gitCommit` metadata keys there by
  // default (any other key stays hidden unless the report URL carries the
  // ?show-metadata-other flag), so the tester line goes under `ci`.
  metadata: {
    ci: { prTitle: `Pruebas E2E ejecutadas por ${testerName} · ${runStamp}` },
  },
  // E2E_REPORT_DIR is set by scripts/run-e2e-report.mjs to a dated folder;
  // a plain `playwright test` run falls back to the default playwright-report.
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: process.env.E2E_REPORT_DIR ?? 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // 'on' keeps the artifact for every test, passed or failed (vs. only on failure).
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});


