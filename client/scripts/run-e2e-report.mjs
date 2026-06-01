// Runs the full Playwright E2E suite and saves the HTML report into a folder
// named after the execution date (and tester) so it can be zipped and shared.
//
//   npm run test:e2e:report           → e2e-reports/2026-05-20_Rodrigo-Narvaez
//   npm run test:e2e:report -- --time → e2e-reports/2026-05-20_14-30-05_Rodrigo-Narvaez
//                                       (use when running several times a day
//                                        so reports don't overwrite each other)
//
// The tester name comes from E2E_TESTER_NAME in client/.env.e2e; it is used in
// the folder name here and stamped into the report metadata (playwright.config.ts).

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, '..'); // client/

dotenv.config({ path: path.join(CLIENT_ROOT, '.env.e2e') });

// ── Build the dated folder name ────────────────────────────────────────
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');

let stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
if (process.argv.includes('--time')) {
  stamp += `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

const tester = (process.env.E2E_TESTER_NAME ?? '').trim();
if (tester) {
  // NFD splits accented letters ("á" → "a" + combining mark). Drop the
  // combining marks (U+0300–U+036F by code point), then keep only A-Z/a-z/0-9.
  const slug = [...tester.normalize('NFD')]
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x300 || code > 0x36f;
    })
    .join('')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) stamp += `_${slug}`;
}

const reportDir = path.join(CLIENT_ROOT, 'e2e-reports', stamp);
mkdirSync(reportDir, { recursive: true });

console.log('\n▶  Ejecutando todas las pruebas E2E…');
console.log(`   Tester:       ${tester || '(E2E_TESTER_NAME no definido en .env.e2e)'}`);
console.log(`   Reporte HTML → ${reportDir}\n`);

// ── Run Playwright — E2E_REPORT_DIR is read by playwright.config.ts ────
const result = spawnSync('npx', ['playwright', 'test'], {
  cwd: CLIENT_ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, E2E_REPORT_DIR: reportDir },
});

// The report is generated whether tests pass or fail.
console.log(`\n✔  Reporte HTML guardado en:\n   ${reportDir}`);
console.log('\n   Para comprimirlo y enviarlo (PowerShell):');
console.log(`   Compress-Archive -Path "${reportDir}\\*" -DestinationPath "${reportDir}.zip"`);
console.log('\n   Quien lo reciba puede abrirlo con:');
console.log('   npx playwright show-report <carpeta-descomprimida>\n');

// Mirror Playwright's exit code so a failed suite is still reported as failed.
process.exit(result.status ?? 1);
