import { test, expect } from '../fixtures/auth.fixture.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToBacklog(page: import('@playwright/test').Page) {
  const projectId = process.env.E2E_PROJECT_ID;
  if (!projectId) throw new Error('E2E_PROJECT_ID must be set in client/.env.e2e');
  await page.goto(`/proyectos/${projectId}/backlog`);
  // Wait until the toolbar "Nuevo" button is visible — page is ready
  await page.getByRole('button', { name: 'Nuevo' }).waitFor({ timeout: 15_000 });
}

async function openCreateForm(page: import('@playwright/test').Page) {
  // The toolbar "Nuevo" button opens a dropdown — choose "Ítem" from it.
  await page.getByRole('button', { name: 'Nuevo' }).click();
  await page.getByRole('button', { name: 'Ítem', exact: true }).click();
  await page.locator('#nombre').waitFor({ timeout: 5_000 });
}

/** Fill minimum required fields: name, status, and type. */
async function fillRequiredFields(page: import('@playwright/test').Page, nombre: string) {
  // Name — plain <input id="nombre">
  await page.locator('#nombre').fill(nombre);

  // Status — CSS Module pill trigger, opened via [class*="pillTrigger"]
  await page.locator('[class*="pillTrigger"]').first().click();
  await page.locator('[class*="pillOption"]').first().waitFor({ timeout: 5_000 });
  await page.locator('[class*="pillOption"]').first().click();

  // Type — plain <select name="id_tipo">
  await page.locator('select[name="id_tipo"]').selectOption({ index: 1 });
}

/** Open the detail panel for the first item in the list, return the panel locator. */
async function openFirstItemDetail(page: import('@playwright/test').Page) {
  await page.locator('[class*="titleClickable"]').first().click();
  // Wait for the "Editar" button that only exists inside the panel
  const editBtn = page.getByRole('button', { name: 'Editar', exact: true });
  await editBtn.waitFor({ timeout: 8_000 });
  return editBtn;
}

// ---------------------------------------------------------------------------
// Tests — Create backlog item
// ---------------------------------------------------------------------------

test.describe('Backlog — crear ítem', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('abre el formulario al crear un nuevo ítem', async ({ page }) => {
    await goToBacklog(page);
    await openCreateForm(page);
    await expect(page.locator('#nombre')).toBeVisible();
  });

  test('muestra errores al enviar el formulario sin completar campos', async ({ page }) => {
    await goToBacklog(page);
    await openCreateForm(page);
    await page.getByRole('button', { name: 'Crear ítem' }).click();
    // At least one field-level error should appear
    await expect(page.locator('[class*="fieldError"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('crea un ítem con los campos requeridos', async ({ page }) => {
    await goToBacklog(page);
    await openCreateForm(page);

    const itemName = `Test ítem ${Date.now()}`;
    await fillRequiredFields(page, itemName);
    await page.getByRole('button', { name: 'Crear ítem' }).click();

    // Form closes on success
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });
    // New item appears in the list
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  test('crea un ítem con campos opcionales', async ({ page }) => {
    await goToBacklog(page);
    await openCreateForm(page);

    const itemName = `Test completo ${Date.now()}`;
    await fillRequiredFields(page, itemName);

    // Description
    await page.locator('textarea[name="descripcion"]').fill('Descripción de prueba automatizada.');

    // Sprint — first non-empty option if available
    const sprintSelect = page.locator('select[name="id_sprint"]');
    const sprintCount  = await sprintSelect.locator('option').count();
    if (sprintCount > 1) await sprintSelect.selectOption({ index: 1 });

    // Responsible — first non-empty option if available
    const respSelect = page.locator('select[name="id_usuario_responsable"]');
    const respCount  = await respSelect.locator('option').count();
    if (respCount > 1) await respSelect.selectOption({ index: 1 });

    // Complexity — click the "3" button (third complexity btn)
    const complexityBtns = page.locator('[class*="complexityBtn"]');
    if (await complexityBtns.count() >= 3) await complexityBtns.nth(2).click();

    await page.getByRole('button', { name: 'Crear ítem' }).click();

    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  test('cancela el formulario sin crear el ítem', async ({ page }) => {
    await goToBacklog(page);
    await openCreateForm(page);

    const itemName = `Cancelado ${Date.now()}`;
    await page.locator('#nombre').fill(itemName);
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Form closed
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 5_000 });
    // Item does NOT appear in the list
    await expect(page.getByText(itemName)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tests — Edit backlog item
// ---------------------------------------------------------------------------

test.describe('Backlog — editar ítem', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  /** Create a disposable item so edit tests always have something to work with. */
  async function createTestItem(page: import('@playwright/test').Page): Promise<string> {
    await openCreateForm(page);
    const name = `Edit target ${Date.now()}`;
    await fillRequiredFields(page, name);
    await page.getByRole('button', { name: 'Crear ítem' }).click();
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
    return name;
  }

  test('abre el panel de detalle al hacer click en el título', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    // Click the title — opens the detail view panel
    await page.locator('[class*="titleClickable"]').first().click();
    // Panel is open if the "Editar" button is visible
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('abre el panel de edición desde el menú de opciones del ítem', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    // Click the ellipsis (⋮) context menu button on the first item
    await page.locator('[class*="iconBtn"][aria-label="Más opciones"]').first().click();
    // Click "Editar" in the context menu that appears
    await page.locator('[class*="element"]').filter({ hasText: 'Editar' }).waitFor({ timeout: 5_000 });
    await page.locator('[class*="element"]').filter({ hasText: 'Editar' }).click();
    // Panel is open in edit mode — title input should be visible
    await expect(page.locator('input[name="nombre"]')).toBeVisible({ timeout: 8_000 });
  });

  test('edita el nombre del ítem', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    // Edit title input: <input name="nombre">
    const titleInput = page.locator('input[name="nombre"]');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    const newName = `Editado ${Date.now()}`;
    await titleInput.fill(newName);

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Panel stays open and shows the updated name (match the heading inside the panel)
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('edita la descripción del ítem', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    const descTextarea = page.locator('textarea[name="descripcion"]');
    await expect(descTextarea).toBeVisible({ timeout: 5_000 });

    const newDesc = 'Descripción editada por Playwright';
    await descTextarea.fill(newDesc);

    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText(newDesc)).toBeVisible({ timeout: 8_000 });
  });

  test('cancela la edición sin guardar cambios', async ({ page }) => {
    await goToBacklog(page);
    const originalName = await createTestItem(page);
    await openFirstItemDetail(page);

    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    const titleInput = page.locator('input[name="nombre"]');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill('Este cambio no se guarda');

    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Original name is still shown in the panel
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 5_000 });
  });

  test('cambia el estado del ítem desde el panel de detalle', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    // Open status pill inside the detail panel
    await page.locator('[class*="pillTrigger"]').first().click();
    await page.locator('[class*="pillOption"]').first().waitFor({ timeout: 5_000 });

    const options = page.locator('[class*="pillOption"]');
    const count   = await options.count();
    // Pick the second option if available, otherwise the first
    await options.nth(count > 1 ? 1 : 0).click();

    await page.getByRole('button', { name: 'Guardar' }).click();

    // No error message should appear after saving
    await expect(page.locator('[class*="inlineError"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('cierra el panel de detalle', async ({ page }) => {
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    // Panel gone — "Editar" button no longer visible
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).not.toBeVisible({ timeout: 5_000 });
  });
});
