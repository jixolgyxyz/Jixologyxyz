import { test, expect } from '../fixtures/auth.fixture.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToDashboard(page: import('@playwright/test').Page) {
  await page.goto('/dashboard-admin');
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).waitFor({ timeout: 15_000 });
}

async function openReportModal(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
  // Modal is open when the "Historial de reportes" section is visible
  await page.getByText('Historial de reportes').waitFor({ timeout: 8_000 });
}

// ---------------------------------------------------------------------------
// Tests — modal open / close
// ---------------------------------------------------------------------------

test.describe('Reporte — abrir y cerrar modal', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('abre el modal de reportes al hacer click en "Generar reporte"', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);
    await expect(page.getByText('Historial de reportes')).toBeVisible();
  });

  test('cierra el modal al hacer click en el botón cerrar', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByText('Historial de reportes')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Tests — reporte semanal
// ---------------------------------------------------------------------------

test.describe('Reporte — reporte semanal', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('el botón "Generar" del reporte semanal está habilitado', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);
    // The standard weekly report "Generar" button (first one in the sidebar)
    const generateBtn = page.locator('[class*="generateBtn"]').first();
    await expect(generateBtn).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Tests — reporte personalizado
// ---------------------------------------------------------------------------

test.describe('Reporte — reporte personalizado', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('muestra error de validación cuando no hay métricas seleccionadas', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    // Deselect all metrics via "Ninguna" toggle
    await page.getByRole('button', { name: 'Ninguna' }).click();

    // Validation message should appear
    await expect(page.getByText('Selecciona al menos una métrica.')).toBeVisible({ timeout: 5_000 });

    // Custom generate button should be disabled
    const customBtn = page.getByRole('button', { name: 'Generar personalizado', exact: true });
    await expect(customBtn).toBeDisabled();
  });

  test('el botón "Generar personalizado" está deshabilitado cuando las fechas son inválidas', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    // Set end date before start date
    const dateInputs = page.locator('[class*="dateInput"]');
    await dateInputs.nth(0).fill('2025-12-31');
    await dateInputs.nth(1).fill('2025-01-01');

    await expect(page.getByText('La fecha de fin debe ser posterior.')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Generar personalizado', exact: true })).toBeDisabled();
  });

  test('permite cambiar el nombre del reporte personalizado', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    const nameInput = page.locator('input[placeholder="Nombre del archivo PDF"]');
    await nameInput.fill('Mi_Reporte_Test');
    await expect(nameInput).toHaveValue('Mi_Reporte_Test');
  });

  test('permite cambiar la visibilidad del reporte', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    // Select "Público" — click the label since the radio input is visually hidden
    await page.locator('label').filter({ hasText: 'Público' }).click();
    await expect(page.getByText('Visible para todos los usuarios.')).toBeVisible({ timeout: 5_000 });

    // Switch back to "Privado"
    await page.locator('label').filter({ hasText: 'Privado' }).click();
    await expect(page.getByText('Solo tú puedes verlo.')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Tests — historial de reportes / filtros
// ---------------------------------------------------------------------------

test.describe('Reporte — historial y filtros', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  test('muestra el historial de reportes o el mensaje vacío', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    // Either a report card or the empty-state message must be present
    const hasReports = await page.locator('[class*="reportCard"]').count();
    if (hasReports === 0) {
      await expect(page.getByText('Sin reportes generados.')).toBeVisible({ timeout: 5_000 });
    } else {
      await expect(page.locator('[class*="reportCard"]').first()).toBeVisible();
    }
  });

  test('filtra reportes por tipo "Semanal"', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    // Open "Tipo" bubble filter and select "Semanal"
    await page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Tipo' }).click();
    await page.getByRole('button', { name: 'Semanal', exact: true }).click();

    // Filter bubble should now show the active label
    await expect(page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Semanal' })).toBeVisible({ timeout: 5_000 });
  });

  test('filtra reportes por visibilidad "Privado"', async ({ page }) => {
    await goToDashboard(page);
    await openReportModal(page);

    await page.locator('[class*="bubbleBtn"]').filter({ hasText: 'Visibilidad' }).click();
    await page.getByRole('button', { name: 'Privado', exact: true }).click();

    await expect(page.locator('[class*="bubbleBtnActive"]').filter({ hasText: 'Privado' })).toBeVisible({ timeout: 5_000 });
  });
});
