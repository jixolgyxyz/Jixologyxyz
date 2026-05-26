import { test, expect } from '../fixtures/auth.fixture.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Page-object helpers
// ---------------------------------------------------------------------------

async function goToBacklog(page: Page) {
  const projectId = process.env.E2E_PROJECT_ID;
  if (!projectId) throw new Error('E2E_PROJECT_ID must be set in client/.env.e2e');
  await page.goto(`/proyectos/${projectId}/backlog`);
  await page.getByRole('button', { name: 'Nuevo' }).waitFor({ timeout: 15_000 });
}

/** Open the "Nuevo → Ítem" dropdown and wait for the form. */
async function openCreateForm(page: Page) {
  await page.getByRole('button', { name: 'Nuevo' }).click();
  await page.getByRole('button', { name: 'Ítem', exact: true }).click();
  await page.locator('#nombre').waitFor({ timeout: 5_000 });
}

/** Fill the minimum required fields: name, status, and type. */
async function fillRequiredFields(page: Page, nombre: string) {
  await page.locator('#nombre').fill(nombre);
  await page.locator('[class*="pillTrigger"]').first().click();
  await page.locator('[class*="pillOption"]').first().waitFor({ timeout: 5_000 });
  await page.locator('[class*="pillOption"]').first().click();
  await page.locator('select[name="id_tipo"]').selectOption({ index: 1 });
}

/**
 * Create a throwaway item and return its name.
 * Caller must already be on the backlog page.
 */
async function createTestItem(page: Page): Promise<string> {
  await openCreateForm(page);
  const name = `Edit target ${Date.now()}`;
  await fillRequiredFields(page, name);
  await page.getByRole('button', { name: 'Crear ítem' }).click();
  await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  return name;
}

/** Click the first item's title to open its detail panel. */
async function openFirstItemDetail(page: Page) {
  await page.locator('[class*="titleClickable"]').first().click();
  const editBtn = page.getByRole('button', { name: 'Editar', exact: true });
  await editBtn.waitFor({ timeout: 8_000 });
  return editBtn;
}

// ---------------------------------------------------------------------------
// Test suite — Crear ítem de backlog
// ---------------------------------------------------------------------------

test.describe('Backlog — Crear ítem', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with a valid account that has access to the project.
  // • E2E_PROJECT_ID is set and the project backlog page is accessible.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-01 | Alta | Abrir formulario de creación
  // Validar que al hacer click en "Nuevo → Ítem" el formulario de creación
  // se abre correctamente con sus campos visibles.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-01 — abre el formulario al seleccionar "Nuevo → Ítem"', async ({ page }) => {
    // Step 1 – Navigate to the project backlog.
    await goToBacklog(page);

    // Step 2 – Click the "Nuevo" button.
    await page.getByRole('button', { name: 'Nuevo' }).click();

    // Step 3 – Select "Ítem" from the dropdown.
    await page.getByRole('button', { name: 'Ítem', exact: true }).click();

    // Expected: the form is visible with at least the name field present.
    await expect(page.locator('#nombre')).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-02 | Alta | Rechazo por campos obligatorios vacíos
  // Validar que el sistema muestre errores de validación cuando se intenta
  // crear un ítem sin completar los campos obligatorios.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-02 — muestra errores de validación al enviar el formulario vacío', async ({ page }) => {
    // Steps 1-3 – Navigate and open the form.
    await goToBacklog(page);
    await openCreateForm(page);

    // Step 4 – Leave all fields empty and click "Crear ítem".
    await page.getByRole('button', { name: 'Crear ítem' }).click();

    // Expected: at least one inline field-error message appears.
    await expect(page.locator('[class*="fieldError"]').first()).toBeVisible({ timeout: 5_000 });

    // Expected: the form remains open (name field is still visible).
    await expect(page.locator('#nombre')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-03 | Alta | Creación exitosa con campos obligatorios
  // Validar que el sistema cree un ítem correctamente cuando se completan
  // únicamente los campos obligatorios con datos válidos.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-03 — crea un ítem con los campos requeridos', async ({ page }) => {
    // Steps 1-3 – Navigate and open the form.
    await goToBacklog(page);
    await openCreateForm(page);

    const itemName = `TC-03 ítem ${Date.now()}`;

    // Step 4 – Enter a valid name.
    // Step 5 – Select a valid status.
    // Step 6 – Select a valid type.
    await fillRequiredFields(page, itemName);

    // Step 7 – Click "Crear ítem".
    await page.getByRole('button', { name: 'Crear ítem' }).click();

    // Expected: the form closes on success.
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });

    // Expected: the new item appears in the backlog list.
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-04 | Media | Creación exitosa con todos los campos opcionales
  // Validar que el sistema cree un ítem correctamente cuando se completan
  // tanto los campos obligatorios como los opcionales.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-04 — crea un ítem con campos obligatorios y opcionales', async ({ page }) => {
    // Steps 1-3 – Navigate and open the form.
    await goToBacklog(page);
    await openCreateForm(page);

    const itemName = `TC-04 completo ${Date.now()}`;

    // Step 4 – Fill required fields.
    await fillRequiredFields(page, itemName);

    // Step 5 – Add an optional description.
    await page.locator('textarea[name="descripcion"]').fill('Descripción de prueba automatizada.');

    // Step 6 – Select a sprint (first non-empty option if available).
    const sprintSelect = page.locator('select[name="id_sprint"]');
    const sprintCount  = await sprintSelect.locator('option').count();
    if (sprintCount > 1) await sprintSelect.selectOption({ index: 1 });

    // Step 7 – Select a responsible user (first non-empty option if available).
    const respSelect = page.locator('select[name="id_usuario_responsable"]');
    const respCount  = await respSelect.locator('option').count();
    if (respCount > 1) await respSelect.selectOption({ index: 1 });

    // Step 8 – Set complexity to 3.
    const complexityBtns = page.locator('[class*="complexityBtn"]');
    if (await complexityBtns.count() >= 3) await complexityBtns.nth(2).click();

    // Step 9 – Click "Crear ítem".
    await page.getByRole('button', { name: 'Crear ítem' }).click();

    // Expected: form closes and the item is visible in the list.
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-05 | Media | Cancelación sin crear el ítem
  // Validar que al cancelar el formulario no se cree ningún ítem y la lista
  // de backlog permanezca sin cambios.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-05 — cancela el formulario sin crear el ítem', async ({ page }) => {
    // Steps 1-3 – Navigate and open the form.
    await goToBacklog(page);
    await openCreateForm(page);

    // Step 4 – Partially fill the form.
    const itemName = `TC-05 cancelado ${Date.now()}`;
    await page.locator('#nombre').fill(itemName);

    // Step 5 – Click "Cancelar" without submitting.
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Expected: the form closes.
    await expect(page.locator('#nombre')).not.toBeVisible({ timeout: 5_000 });

    // Expected: the item does NOT appear in the backlog list.
    await expect(page.getByText(itemName)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Test suite — Editar ítem de backlog
// ---------------------------------------------------------------------------

test.describe('Backlog — Editar ítem', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with a valid account that has access to the project.
  // • At least one backlog item exists (each test creates its own via createTestItem).

  // ─────────────────────────────────────────────────────────────────────────
  // TC-06 | Alta | Apertura del panel de detalle
  // Validar que al hacer click en el título de un ítem se abra el panel
  // de detalle con la información del ítem.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-06 — abre el panel de detalle al hacer click en el título', async ({ page }) => {
    // Step 1 – Navigate to the backlog.
    await goToBacklog(page);

    // Step 2 – Ensure an item exists.
    await createTestItem(page);

    // Step 3 – Click the first item's title.
    await page.locator('[class*="titleClickable"]').first().click();

    // Expected: the detail panel is open with the "Editar" button visible.
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-07 | Alta | Apertura del panel desde el menú contextual
  // Validar que al hacer click en el menú de opciones (⋮) se pueda acceder
  // al panel de edición directamente desde la lista.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-07 — abre el panel de edición desde el menú contextual del ítem', async ({ page }) => {
    // Steps 1-2 – Navigate and ensure an item exists.
    await goToBacklog(page);
    await createTestItem(page);

    // Step 3 – Click the "⋮ Más opciones" button on the first item.
    await page.locator('[class*="iconBtn"][aria-label="Más opciones"]').first().click();

    // Step 4 – Click "Editar" in the context menu.
    await page.locator('[class*="element"]').filter({ hasText: 'Editar' }).waitFor({ timeout: 5_000 });
    await page.locator('[class*="element"]').filter({ hasText: 'Editar' }).click();

    // Expected: the detail panel opens directly in edit mode (name input visible).
    await expect(page.locator('input[name="nombre"]')).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-08 | Alta | Edición exitosa del nombre
  // Validar que el sistema guarde correctamente el nuevo nombre de un ítem
  // cuando se edita desde el panel de detalle.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-08 — edita y guarda el nombre del ítem', async ({ page }) => {
    // Steps 1-2 – Navigate and create a test item.
    await goToBacklog(page);
    await createTestItem(page);

    // Step 3 – Open the detail panel.
    await openFirstItemDetail(page);

    // Step 4 – Click "Editar".
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const titleInput = page.locator('input[name="nombre"]');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    // Step 5 – Clear the current name and enter the new one.
    const newName = `TC-08 editado ${Date.now()}`;
    await titleInput.fill(newName);

    // Step 6 – Click "Guardar".
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Expected: the updated name is shown in the detail panel heading.
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-09 | Alta | Rechazo por nombre vacío al editar
  // Validar que el sistema no permita guardar un ítem cuando el nombre
  // se deja vacío durante la edición.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-09 — el botón Guardar se deshabilita al vaciar el nombre', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Enter edit mode.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const titleInput = page.locator('input[name="nombre"]');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    // Step 5 – Delete the entire name.
    await titleInput.fill('');

    // Expected: the "Guardar" button is disabled while the name is empty.
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-10 | Media | Edición exitosa de la descripción
  // Validar que el sistema guarde correctamente una descripción nueva
  // cuando se edita desde el panel de detalle.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-10 — edita y guarda la descripción del ítem', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Enter edit mode.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const descTextarea = page.locator('textarea[name="descripcion"]');
    await expect(descTextarea).toBeVisible({ timeout: 5_000 });

    // Step 5 – Enter a new description.
    const newDesc = 'Descripción editada por Playwright TC-10';
    await descTextarea.fill(newDesc);

    // Step 6 – Click "Guardar".
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Expected: the new description is visible in the detail panel.
    await expect(page.getByText(newDesc)).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-11 | Media | Cancelación de edición sin guardar cambios
  // Validar que al cancelar la edición, el nombre original del ítem se
  // restaure y los cambios no se persistan.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-11 — cancela la edición y restaura el nombre original', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    const originalName = await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Enter edit mode.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const titleInput = page.locator('input[name="nombre"]');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    // Step 5 – Type a new name.
    await titleInput.fill('Este cambio no debe guardarse');

    // Step 6 – Click "Cancelar" instead of "Guardar".
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Expected: the original name is shown in the panel; changes are discarded.
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-12 | Media | Cambio de estado del ítem
  // Validar que el sistema guarde correctamente el nuevo estado cuando
  // se cambia desde el panel de detalle en modo edición.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-12 — cambia el estado del ítem y guarda sin errores', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Enter edit mode.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    // Step 5 – Open the status pill dropdown and select the second option.
    await page.locator('[class*="pillTrigger"]').first().click();
    await page.locator('[class*="pillOption"]').first().waitFor({ timeout: 5_000 });
    const options = page.locator('[class*="pillOption"]');
    const count   = await options.count();
    await options.nth(count > 1 ? 1 : 0).click();

    // Step 6 – Click "Guardar".
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Expected: no inline error appears after saving.
    await expect(page.locator('[class*="inlineError"]')).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-13 | Media | Cambio de prioridad del ítem
  // Validar que el sistema guarde correctamente la prioridad seleccionada
  // cuando se edita desde el panel de detalle.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-13 — cambia la prioridad del ítem y guarda sin errores', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Enter edit mode.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    // Step 5 – Open the priority dropdown (iconTrigger) and pick the first option.
    await page.locator('[class*="iconTrigger"]').first().click();
    await page.locator('[class*="iconOption"]').first().waitFor({ timeout: 5_000 });
    await page.locator('[class*="iconOption"]').first().click();

    // Step 6 – Click "Guardar".
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Expected: no inline error appears after saving.
    await expect(page.locator('[class*="inlineError"]')).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-14 | Baja | Cierre del panel de detalle
  // Validar que al cerrar el panel de detalle, éste desaparezca de la vista
  // y la lista del backlog vuelva a ser visible.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-14 — cierra el panel de detalle correctamente', async ({ page }) => {
    // Steps 1-3 – Navigate, create item, open detail panel.
    await goToBacklog(page);
    await createTestItem(page);
    await openFirstItemDetail(page);

    // Step 4 – Click the close button (X / "Cerrar").
    const closeBtn = page.getByRole('button', { name: 'Cerrar', exact: true });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback: close button may use an aria-label
      await page.getByRole('button', { name: /cerrar/i }).click();
    }

    // Expected: the "Editar" button (only in the panel) is no longer visible.
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).not.toBeVisible({ timeout: 5_000 });
  });
});
