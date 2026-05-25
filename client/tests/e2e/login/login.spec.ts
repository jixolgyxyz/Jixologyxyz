import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_EMAIL    = process.env.E2E_EMAIL!;
const VALID_PASSWORD = process.env.E2E_PASSWORD!;

// ---------------------------------------------------------------------------
// Page-object helpers
// ---------------------------------------------------------------------------

async function goToLogin(page: import('@playwright/test').Page) {
  await page.goto('/inicio-sesion');
  await page.locator('#email').waitFor({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Test suite — Inicio de sesión
// ---------------------------------------------------------------------------

test.describe('Login — Inicio de sesión', () => {

  // ── Pre-condition shared across all tests ────────────────────────────────
  // • The application is accessible.
  // • At least one registered account exists in the system.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-01 | Alta | Inicio de sesión con credenciales válidas
  // Validar que un usuario registrado pueda iniciar sesión correctamente
  // con correo y contraseña válidos.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-01 — redirige al perfil con credenciales válidas', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Enter a valid registered email.
    await page.fill('#email', VALID_EMAIL);

    // Step 3 – Enter the correct password for that account.
    await page.fill('#password', VALID_PASSWORD);

    // Step 4 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: the system redirects to /perfil within the timeout.
    await page.waitForURL('**/perfil', { timeout: 10_000 });
    expect(page.url()).toContain('/perfil');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-02 | Alta | Rechazo por contraseña incorrecta
  // Validar que el sistema muestre un error cuando la contraseña ingresada
  // no corresponde a la cuenta registrada.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-02 — muestra error con correo válido y contraseña incorrecta', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Enter a valid, existing email.
    await page.fill('#email', VALID_EMAIL);

    // Step 3 – Enter an incorrect password.
    await page.fill('#password', 'WrongPassword999!');

    // Step 4 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: an error card appears; the user stays on the login page.
    await expect(page.locator('.log-in-page__status-card--error')).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain('/inicio-sesion');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-03 | Alta | Rechazo por cuenta inexistente
  // Validar que el sistema muestre un error cuando el correo ingresado
  // no está registrado en el sistema.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-03 — muestra error con credenciales de cuenta inexistente', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Enter a non-existent email.
    await page.fill('#email', 'noexiste@ejemplo.com');

    // Step 3 – Enter any password.
    await page.fill('#password', 'CualquierPass123!');

    // Step 4 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: error card is visible; user stays on the login page.
    await expect(page.locator('.log-in-page__status-card--error')).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain('/inicio-sesion');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-04 | Alta | Rechazo por campos vacíos
  // Validar que el sistema no permita el inicio de sesión cuando los campos
  // de correo y contraseña están vacíos.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-04 — permanece en la página de login con campos vacíos', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Leave email and password empty.
    // Step 3 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: no redirect occurs; the user stays on the login page.
    expect(page.url()).toContain('/inicio-sesion');
    await expect(page.locator('#email')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-05 | Media | Rechazo por formato de correo inválido
  // Validar que el sistema impida enviar el formulario cuando el correo
  // ingresado no tiene un formato válido.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-05 — no envía el formulario con formato de correo inválido', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Enter an email without the "@domain" part.
    await page.fill('#email', 'usuarioSinArroba');

    // Step 3 – Enter any password.
    await page.fill('#password', VALID_PASSWORD);

    // Step 4 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: browser-level validation prevents submission; user stays on login.
    expect(page.url()).toContain('/inicio-sesion');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-06 | Media | Rechazo con solo el correo ingresado
  // Validar que el sistema no permita el inicio de sesión cuando únicamente
  // se ingresa el correo sin contraseña.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-06 — no envía el formulario con contraseña vacía', async ({ page }) => {
    // Step 1 – Navigate to the login page.
    await goToLogin(page);

    // Step 2 – Enter a valid email.
    await page.fill('#email', VALID_EMAIL);

    // Step 3 – Leave the password field empty.
    // Step 4 – Click the submit button.
    await page.click('button[type="submit"]');

    // Expected: no redirect; user stays on the login page.
    expect(page.url()).toContain('/inicio-sesion');
    await expect(page.locator('#password')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-07 | Baja | Persistencia de sesión tras navegación
  // Validar que después de iniciar sesión, al navegar a otra ruta y regresar
  // el usuario permanece autenticado.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-07 — la sesión persiste al navegar a otra página y volver', async ({ page }) => {
    // Step 1 – Log in with valid credentials.
    await goToLogin(page);
    await page.fill('#email', VALID_EMAIL);
    await page.fill('#password', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/perfil', { timeout: 10_000 });

    // Step 2 – Navigate away from the profile page.
    await page.goto('/usuarios');
    await page.waitForURL('**/usuarios', { timeout: 8_000 });

    // Step 3 – Navigate back to the profile page.
    await page.goto('/perfil');

    // Expected: user remains authenticated and lands on the profile page.
    await page.waitForURL('**/perfil', { timeout: 8_000 });
    expect(page.url()).toContain('/perfil');
  });
});
