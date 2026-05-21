import { test, expect } from '../fixtures/auth.fixture.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the admin users page (/usuarios) and wait until it is ready. */
async function goToUsers(page: import('@playwright/test').Page) {
  await page.goto('/usuarios');
  // The page-level "Crear usuario" button confirms the admin page rendered.
  await page.getByRole('button', { name: 'Crear usuario' }).waitFor({ timeout: 15_000 });
}

/** Open the "Crear usuario" modal and wait for its form. */
async function openCreateUserForm(page: import('@playwright/test').Page) {
  // While the modal is closed only the page button carries this name.
  await page.getByRole('button', { name: 'Crear usuario' }).click();
  await page.locator('#email').waitFor({ timeout: 5_000 });
}

/** The form's own submit button — distinct from the page button that opens the modal. */
function submitButton(page: import('@playwright/test').Page) {
  return page.locator('.register-user-card__button--primary');
}

// ---------------------------------------------------------------------------
// Tests — Create user
// ---------------------------------------------------------------------------

test.describe('Usuarios — crear usuario', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('abre el modal de crear usuario', async ({ page }) => {
    await goToUsers(page);
    await openCreateUserForm(page);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('valida el formato del correo electrónico', async ({ page }) => {
    await goToUsers(page);
    await openCreateUserForm(page);

    await page.locator('#email').fill('correo-invalido');
    await page.locator('#email').blur();

    await expect(page.getByText('Ingresa un correo electrónico válido.')).toBeVisible({ timeout: 5_000 });
  });

  test('el botón de crear se mantiene deshabilitado sin los campos obligatorios', async ({ page }) => {
    await goToUsers(page);
    await openCreateUserForm(page);

    // Empty form — required fields (email, password, zona horaria, rol) missing.
    await expect(submitButton(page)).toBeDisabled();
  });

  test('crea un usuario con los campos requeridos', async ({ page }) => {
    await goToUsers(page);
    await openCreateUserForm(page);

    // Unique email so the test can be re-run without colliding.
    const email = `e2e.user.${Date.now()}@example.com`;

    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Test1234!');
    // Selects load their options asynchronously; index 0 is the placeholder.
    await page.locator('#id_zona_horaria').selectOption({ index: 1 });
    await page.locator('#id_rol_global').selectOption({ index: 1 });
    // Optional fields — give the created user a recognisable name.
    await page.locator('#nombre').fill('E2E');
    await page.locator('#apellido').fill('Tester');

    // With every required field set, the submit button becomes enabled.
    await expect(submitButton(page)).toBeEnabled({ timeout: 8_000 });
    await submitButton(page).click();

    // On success the modal closes…
    await expect(page.locator('#email')).not.toBeVisible({ timeout: 15_000 });

    // …and the new user appears in the list (search bypasses the 10-row cap).
    await page.getByPlaceholder('Buscar usuario por nombre o correo...').fill(email);
    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
  });
});
