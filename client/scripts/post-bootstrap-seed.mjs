import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// client/scripts -> repo root
const ROOT = path.resolve(__dirname, '..', '..');

const DB_URL =
  process.env.SUPABASE_LOCAL_DB_URL ||
  'postgresql://postgres:postgres@localhost:54322/postgres';

const SQL_FILES = [
  path.join(ROOT, 'scripts', 'insertProjects.sql'),
  path.join(ROOT, 'scripts', 'InsertProjectsToUser.sql'),
  path.join(ROOT, 'scripts', 'InsertValoresInventario.sql'),
  path.join(ROOT, 'scripts', 'InsertEstatusBacklogItem.sql'),
  path.join(ROOT, 'scripts', 'InsertDummySprint.sql'),
  path.join(ROOT, 'scripts', 'InsertDummyBacklogItems.sql'),
  path.join(ROOT, 'scripts', 'InsertDummyJornadaFTE.sql'),
];

async function withRetry(label, fn, attempts = 5, delayMs = 3000) {
  let lastError;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[${label}] intento ${i}/${attempts} falló:`, error.message);

      if (i < attempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}

async function runSqlFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`No se encontró el archivo SQL: ${filePath}`);
  }

  const sql = readFileSync(filePath, 'utf8').trim();

  if (!sql) {
    console.log(`Se omite archivo vacío: ${path.basename(filePath)}`);
    return;
  }

  await withRetry(`Ejecutando ${path.basename(filePath)}`, async () => {
    const client = new Client({
      connectionString: DB_URL,
    });

    try {
      await client.connect();
      console.log(`\nEjecutando: ${path.basename(filePath)}`);
      await client.query(sql);
      console.log(`OK: ${path.basename(filePath)}`);
    } finally {
      await client.end();
    }
  });
}

async function main() {
  for (const file of SQL_FILES) {
    await runSqlFile(file);
  }

  console.log('\n[MJS] Setup local completado correctamente.');
}

main().catch((error) => {
  console.error('\n[MJS] Falló el setup local.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});