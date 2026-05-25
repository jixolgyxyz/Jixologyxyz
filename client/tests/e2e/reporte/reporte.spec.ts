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

async function goToDashboard(page: Page) {
  await page.goto('/dashboard-admin');
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).waitFor({ timeout: 15_000 });
}

async function openReportModal(page: Page) {
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
  await page.getByText('Historial de reportes').waitFor({ timeout: 8_000 });
}

// ---------------------------------------------------------------------------
// Test suite — Abrir y cerrar modal
// ---------------------------------------------------------------------------

test.describe('Reporte — Abrir y cerrar modal', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with an administrator account.
  // • The admin dashboard (/dashboard-admin) is accessible.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-01 | Alta | Abrir modal de reportes
  // Validar que al hacer click en "Generar reporte" el modal se abra
  // correctamente y muestre la sección de historial.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-01 — abre el modal al hacer click en "Generar reporte"', async ({ page }) => {
    // Step 1 – Navigate to the admin dashboard.
    await goToDashboard(page);

    // Step 2 – Click the "Generar reporte" button.
    await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();

    // Expected: the modal opens and the "Historial de reportes" section is visible.
    await expect(page.getByText('Historial de reportes')).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-02 | Alta | Cerrar modal con el botón Cerrar
  // Validar que al hacer click en el botón de cerrar (X), el modal
  // se oculte y el dashboard quede visible.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-02 — cierra el modal al hacer click en el botón cerrar', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Click the close (X) button.
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    // Expected: the "Historial de reportes" text is no longer visible.
    await expect(page.getByText('Historial de reportes')).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-03 | Media | Cerrar modal al hacer click fuera del panel
  // Validar que al hacer click en el overlay (área fuera del panel) el modal
  // se cierre correctamente.
  // Note: GenerateReportModal closes via onClick on its overlay backdrop —
  //       there is no Escape-key handler in this component.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-03 — cierra el modal al hacer click fuera del panel', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Click on the overlay backdrop (top-left corner, outside the panel).
    await page.mouse.click(10, 10);

    // Expected: the modal is no longer visible.
    await expect(page.getByText('Historial de reportes')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Test suite — Reporte semanal
// ---------------------------------------------------------------------------

test.describe('Reporte — Reporte semanal', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-04 | Alta | Botón de generación semanal habilitado
  // Validar que el botón "Generar" del reporte semanal estándar esté
  // habilitado y listo para usarse cuando el modal se abre.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-04 — el botón "Generar" del reporte semanal está habilitado al abrir el modal', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Locate the weekly-report generate button (first generateBtn in the sidebar).
    const generateBtn = page.locator('[class*="generateBtn"]').first();

    // Expected: the button is enabled and clickable.
    await expect(generateBtn).toBeEnabled({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Test suite — Reporte personalizado
// ---------------------------------------------------------------------------

test.describe('Reporte — Reporte personalizado', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-05 | Alta | Validación al generar sin métricas seleccionadas
  // Validar que el sistema muestre un error de validación cuando se intenta
  // generar un reporte personalizado sin seleccionar ninguna métrica.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-05 — muestra error de validación cuando no hay métricas seleccionadas', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Click "Ninguna" to deselect all metrics.
    await page.getByRole('button', { name: 'Ninguna' }).click();

    // Expected: a validation message appears.
    await expect(page.getByText('Selecciona al menos una métrica.')).toBeVisible({ timeout: 5_000 });

    // Expected: the "Generar personalizado" button is disabled.
    await expect(page.getByRole('button', { name: 'Generar personalizado', exact: true })).toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-06 | Alta | Validación con rango de fechas inválido
  // Validar que el sistema muestre un error y deshabilite el botón cuando la
  // fecha de fin es anterior a la fecha de inicio.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-06 — deshabilita el botón con fecha de fin anterior a la fecha de inicio', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Set the start date to a later date than the end date.
    const dateInputs = page.locator('[class*="dateInput"]');
    await dateInputs.nth(0).fill('2025-12-31');

    // Step 4 – Set the end date to an earlier date.
    await dateInputs.nth(1).fill('2025-01-01');

    // Expected: a date-range error message is visible.
    await expect(page.getByText('La fecha de fin debe ser posterior.')).toBeVisible({ timeout: 5_000 });

    // Expected: the generate button is disabled.
    await expect(page.getByRole('button', { name: 'Generar personalizado', exact: true })).toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-07 | Media | Rango de fechas válido habilita el botón
  // Validar que el botón "Generar personalizado" se habilite cuando se
  // ingresa un rango de fechas válido (inicio < fin).
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-07 — habilita el botón con un rango de fechas válido', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Set a valid start date.
    const dateInputs = page.locator('[class*="dateInput"]');
    await dateInputs.nth(0).fill('2025-01-01');

    // Step 4 – Set an end date later than the start date.
    await dateInputs.nth(1).fill('2025-12-31');

    // Expected: no date-error message is shown.
    await expect(page.getByText('La fecha de fin debe ser posterior.')).not.toBeVisible({ timeout: 3_000 });

    // Expected: the generate button is enabled (assuming at least one metric is selected).
    await expect(page.getByRole('button', { name: 'Generar personalizado', exact: true })).toBeEnabled({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-08 | Media | Cambio del nombre del archivo del reporte
  // Validar que el campo del nombre del reporte personalizado acepte y
  // muestre correctamente el texto ingresado por el usuario.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-08 — permite cambiar el nombre del archivo del reporte', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Locate the filename input and clear it.
    const nameInput = page.locator('input[placeholder="Nombre del archivo PDF"]');

    // Step 4 – Enter a custom report name.
    await nameInput.fill('Reporte_TC08_Test');

    // Expected: the field shows exactly the value entered.
    await expect(nameInput).toHaveValue('Reporte_TC08_Test');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-09 | Media | Cambio de visibilidad del reporte
  // Validar que al cambiar la visibilidad entre "Público" y "Privado"
  // el sistema muestre la descripción correspondiente a cada opción.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-09 — cambia la visibilidad entre Público y Privado', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Select "Público".
    await page.locator('label').filter({ hasText: 'Público' }).click();

    // Expected: the public description is shown.
    await expect(page.getByText('Visible para todos los usuarios.')).toBeVisible({ timeout: 5_000 });

    // Step 4 – Switch back to "Privado".
    await page.locator('label').filter({ hasText: 'Privado' }).click();

    // Expected: the private description is shown.
    await expect(page.getByText('Solo tú puedes verlo.')).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-10 | Media | Seleccionar todas las métricas
  // Validar que al hacer click en "Todas" se seleccionen todas las métricas
  // disponibles y el botón de generar se habilite.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-10 — habilita el botón al seleccionar todas las métricas', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Deselect all metrics first.
    await page.getByRole('button', { name: 'Ninguna' }).click();
    await expect(page.getByText('Selecciona al menos una métrica.')).toBeVisible({ timeout: 5_000 });

    // Step 4 – Click "Todas" to select every metric.
    await page.getByRole('button', { name: 'Todas' }).click();

    // Expected: the validation error disappears.
    await expect(page.getByText('Selecciona al menos una métrica.')).not.toBeVisible({ timeout: 5_000 });

    // Expected: the generate button is enabled again.
    await expect(page.getByRole('button', { name: 'Generar personalizado', exact: true })).toBeEnabled({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Test suite — Historial de reportes y filtros
// ---------------------------------------------------------------------------

test.describe('Reporte — Historial y filtros', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-11 | Alta | Visualización del historial de reportes
  // Validar que el historial muestre tarjetas de reportes existentes
  // o el mensaje de estado vacío cuando no hay reportes generados.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-11 — muestra tarjetas de reporte o el mensaje de estado vacío', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Check the history section.
    const hasReports = await page.locator('[class*="reportCard"]').count();

    if (hasReports === 0) {
      // Expected (no reports): the empty-state message is visible.
      await expect(page.getByText('Sin reportes generados.')).toBeVisible({ timeout: 5_000 });
    } else {
      // Expected (reports exist): at least one report card is visible.
      await expect(page.locator('[class*="reportCard"]').first()).toBeVisible();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-12 | Media | Filtrar historial por tipo "Semanal"
  // Validar que al aplicar el filtro "Tipo → Semanal" el sistema
  // actualice la lista y muestre el filtro como activo.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-12 — filtra el historial por tipo "Semanal"', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Open the "Tipo" filter bubble.
    await page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Tipo' }).click();

    // Step 4 – Select "Semanal" from the dropdown.
    await page.getByRole('button', { name: 'Semanal', exact: true }).click();

    // Expected: the filter bubble shows "Semanal" as the active selection.
    await expect(
      page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Semanal' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-13 | Media | Filtrar historial por visibilidad "Privado"
  // Validar que al aplicar el filtro "Visibilidad → Privado" el sistema
  // actualice la lista y muestre el filtro como activo.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-13 — filtra el historial por visibilidad "Privado"', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Open the "Visibilidad" filter bubble.
    await page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Visibilidad' }).click();

    // Step 4 – Select "Privado".
    await page.getByRole('button', { name: 'Privado', exact: true }).click();

    // Expected: the "Privado" filter is active.
    await expect(
      page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Privado' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-14 | Baja | Limpiar filtros del historial
  // Validar que al hacer click en "Limpiar filtros" todos los filtros activos
  // se restablezcan y el botón desaparezca de la barra de filtros.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-14 — limpia el filtro de tipo y restaura la vista completa', async ({ page }) => {
    // Steps 1-2 – Navigate and open the modal.
    await goToDashboard(page);
    await openReportModal(page);

    // Step 3 – Apply the "Semanal" type filter.
    await page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Tipo' }).click();
    await page.getByRole('button', { name: 'Semanal', exact: true }).click();
    await expect(
      page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Semanal' }),
    ).toBeVisible({ timeout: 5_000 });

    // Step 4 – "Limpiar filtros" button should now be visible.
    const clearBtn = page.getByRole('button', { name: 'Limpiar filtros', exact: true });
    await expect(clearBtn).toBeVisible({ timeout: 5_000 });

    // Step 5 – Click "Limpiar filtros".
    await clearBtn.click();

    // Expected: the "Semanal" active bubble is gone.
    await expect(
      page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Semanal' }),
    ).not.toBeVisible({ timeout: 5_000 });

    // Expected: the "Tipo" bubble is back to its default inactive state.
    await expect(
      page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Tipo' }),
    ).toBeVisible({ timeout: 5_000 });

    // Expected: the "Limpiar filtros" button itself disappears (no active filters).
    await expect(clearBtn).not.toBeVisible({ timeout: 5_000 });
  });
});
