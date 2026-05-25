import { test, expect } from '../fixtures/auth.fixture.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.e2e') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URLS = {
  user:    '/dashboard-usuario',
  project: '/dashboard-proyectos',
  admin:   '/dashboard-admin',
};

// ---------------------------------------------------------------------------
// Page-object helpers
// ---------------------------------------------------------------------------

/** Navigate and wait until the Personalizar button is rendered. */
async function goToDashboard(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole('button', { name: 'Personalizar' }).waitFor({ timeout: 15_000 });
}

/** Click "Personalizar" and wait for the CustomizePanel dialog. */
async function openCustomizePanel(page: Page) {
  await page.getByRole('button', { name: 'Personalizar' }).click();
  await page.getByRole('dialog', { name: 'Personalizar dashboard' }).waitFor({ timeout: 8_000 });
}

/** The CustomizePanel dialog locator. */
const panel = (page: Page) =>
  page.getByRole('dialog', { name: 'Personalizar dashboard' });

/** The first graph card <li> in the list inside the panel. */
const firstCard = (page: Page) =>
  panel(page).locator('ul li').first();

/** The visibility toggle (role=switch) inside the right column of the panel. */
const visibilityToggle = (page: Page) =>
  panel(page).locator('[role="switch"]');

// ---------------------------------------------------------------------------
// ── 1. DASHBOARD DE USUARIO (/dashboard-usuario) ─────────────────────────
// ---------------------------------------------------------------------------

test.describe('Dashboard — Usuario (/dashboard-usuario)', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with any valid account.
  // • /dashboard-usuario is accessible for all authenticated users.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-01 | Alta | Renderizado de la página con saludo y tarjetas de estadísticas
  // Validar que el dashboard de usuario muestre el saludo personalizado y las
  // cuatro tarjetas de estadísticas al cargar la página.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-01 — renderiza el saludo y las tarjetas de estadísticas', async ({ page }) => {
    // Step 1 – Navigate to the user dashboard.
    await goToDashboard(page, URLS.user);

    // Expected: the personalised greeting is shown.
    await expect(page.locator('[class*="greeting"]')).toBeVisible();

    // Expected: all four stat cards are present.
    // Scoped to [class*="statRow"] + exact:true to avoid matching graph card titles
    // that contain the same words (e.g. OverdueCard h3 "Ítems vencidos" is a
    // substring match for "Vencidos" when exact is false).
    const statRow = page.locator('[class*="statRow"]');
    await expect(statRow.getByText('Total asignados', { exact: true })).toBeVisible();
    await expect(statRow.getByText('Vencidos',        { exact: true })).toBeVisible();
    await expect(statRow.getByText('Con estimación',  { exact: true })).toBeVisible();
    await expect(statRow.getByText('Horas totales',   { exact: true })).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-02 | Alta | Apertura del panel "Personalizar"
  // Validar que al hacer click en "Personalizar" el panel lateral se abra
  // con la lista de gráficas disponibles.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-02 — el botón Personalizar abre el CustomizePanel', async ({ page }) => {
    // Step 1 – Navigate.
    await goToDashboard(page, URLS.user);

    // Step 2 – Click "Personalizar".
    await openCustomizePanel(page);

    // Expected: the panel dialog is visible.
    await expect(panel(page)).toBeVisible();

    // Expected: at least one graph card with a checkbox is listed.
    await expect(firstCard(page).locator('input[type="checkbox"]')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-03 | Alta | Ocultar una gráfica desde el checkbox
  // Validar que al desmarcar el checkbox de una gráfica, ésta se marque
  // como oculta en el panel.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-03 — desmarca el checkbox de una gráfica para ocultarla', async ({ page }) => {
    // Step 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    const cb = firstCard(page).locator('input[type="checkbox"]');

    // Step 3 – Ensure the graph is currently visible (checked).
    if (!(await cb.isChecked())) await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });

    // Step 4 – Uncheck to hide the graph.
    await cb.click();

    // Expected: checkbox is now unchecked.
    await expect(cb).not.toBeChecked({ timeout: 5_000 });

    // Step 5 – Restore original state.
    await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-04 | Alta | Cambiar visibilidad desde el toggle del panel derecho
  // Validar que al seleccionar una gráfica y hacer click en el toggle
  // "VISIBLE", el estado de visibilidad cambie correctamente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-04 — el toggle de visibilidad en el panel derecho cambia el estado', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Select the first graph card to load its right-panel detail.
    await firstCard(page).click();
    await expect(visibilityToggle(page)).toBeVisible({ timeout: 5_000 });

    // Step 4 – Record the current aria-checked state and click the toggle.
    const before = await visibilityToggle(page).getAttribute('aria-checked');
    await visibilityToggle(page).click();
    const after = await visibilityToggle(page).getAttribute('aria-checked');

    // Expected: the state changed.
    expect(after).not.toBe(before);

    // Step 5 – Restore.
    await visibilityToggle(page).click();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-05 | Media | Búsqueda de gráfica por nombre
  // Validar que el campo de búsqueda dentro del panel filtre correctamente
  // las gráficas por nombre.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-05 — la búsqueda filtra gráficas por nombre', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Capture the label of the first graph.
    const firstLabel = await panel(page).locator('[class*="cardLabel"]').first().textContent() ?? '';

    // Step 4 – Type the first 4 characters into the search input.
    const searchInput = panel(page).locator('input[placeholder="Buscar gráfica…"]');
    await searchInput.fill(firstLabel.slice(0, 4));

    // Expected: the matching graph is still visible.
    await expect(panel(page).locator('[class*="cardLabel"]').first()).toBeVisible({ timeout: 5_000 });

    // Step 5 – Search for a term that matches nothing.
    await searchInput.fill('zzzznoexiste');

    // Expected: the "Sin resultados." empty state appears.
    await expect(panel(page).getByText('Sin resultados.')).toBeVisible({ timeout: 5_000 });

    // Step 6 – Clear the search to restore the full list.
    await searchInput.fill('');
    await expect(firstCard(page)).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-06 | Media | Filtrar gráficas por tipo de gráfica
  // Validar que el filtro de tipo dentro del panel reduzca la lista de
  // gráficas al tipo seleccionado.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-06 — filtra las gráficas por tipo de gráfica en el panel', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Click the "Tipo" filter bubble inside the panel.
    await panel(page).locator('[class*="bubbleBtn"]').first().click();
    const menuItems = panel(page).locator('[class*="bubbleMenuItem"]');
    await expect(menuItems.first()).toBeVisible({ timeout: 5_000 });

    // Step 4 – Select the first chart type.
    await menuItems.first().click();

    // Expected: the bubble shows as active.
    await expect(panel(page).locator('[class*="bubbleBtnActive"]')).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-07 | Alta | Entrar al modo de reorganización (drag handles visibles)
  // Validar que al hacer click en "Reorganizar gráficas" el panel se cierre
  // y aparezcan los controladores de arrastre en la grilla.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-07 — "Reorganizar gráficas" cierra el panel y activa los drag handles', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Click "Reorganizar gráficas".
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();

    // Expected: the panel closes.
    await expect(panel(page)).not.toBeVisible({ timeout: 5_000 });

    // Expected: drag handles appear on each grid card.
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Expected: the grid wrapper has the "reorganizing" class.
    await expect(page.locator('[class*="reorganizing"]')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-08 | Alta | Mover una gráfica arrastrando el drag handle
  // Validar que en modo reorganización sea posible arrastrar una gráfica
  // a una nueva posición en la grilla.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-08 — arrastra una gráfica a una nueva posición en la grilla', async ({ page }) => {
    // Steps 1-2 – Navigate and enter reorganize mode.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 3 – Get the bounding box of the first drag handle.
    const handle = page.locator('[class*="dragHandle"]').first();
    const box    = await handle.boundingBox();
    if (!box) throw new Error('Drag handle has no bounding box');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Step 4 – Drag 200px to the right.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 200, startY, { steps: 10 });
    await page.mouse.up();

    // Expected: the grid still has drag handles (reorganize mode is still active).
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-09 | Alta | Redimensionar una gráfica en modo reorganización
  // Validar que en modo reorganización sea posible redimensionar una gráfica
  // usando el control de resize de react-grid-layout.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-09 — redimensiona una gráfica usando el controlador de resize', async ({ page }) => {
    // Steps 1-2 – Navigate and enter reorganize mode.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 3 – Find the resize handle (bottom-right corner of first grid item).
    const resizeHandle = page.locator('.react-resizable-handle-se').first();
    const visible = await resizeHandle.isVisible().catch(() => false);
    if (!visible) {
      // Resize handles may only show on hover — hover first grid item.
      await page.locator('[class*="gridItem"]').first().hover();
    }

    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle has no bounding box');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Step 4 – Drag the resize handle 80px diagonally.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 40, { steps: 10 });
    await page.mouse.up();

    // Expected: the grid item is still rendered (resize did not crash the app).
    await expect(page.locator('[class*="gridItem"]').first()).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-10 | Alta | Salir del modo de reorganización
  // Validar que al re-abrir el panel y hacer click en "Salir de reorganización"
  // los drag handles desaparezcan y la grilla vuelva a su estado normal.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-10 — sale del modo reorganización y los drag handles desaparecen', async ({ page }) => {
    // Step 1 – Enter reorganize mode.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 2 – Re-open the panel; the button now reads "Salir de reorganización".
    await openCustomizePanel(page);
    const exitBtn = page.getByRole('button', { name: 'Salir de reorganización' });
    await expect(exitBtn).toBeVisible({ timeout: 5_000 });

    // Step 3 – Click it.
    await exitBtn.click();

    // Expected: drag handles are gone.
    await expect(page.locator('[class*="dragHandle"]').first()).not.toBeVisible({ timeout: 5_000 });

    // Expected: the "reorganizing" CSS class is removed from the grid wrapper.
    await expect(page.locator('[class*="reorganizing"]')).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-11 | Media | Cerrar el panel con la tecla Escape
  // Validar que al presionar Escape el panel se cierre correctamente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-11 — cierra el CustomizePanel con la tecla Escape', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Press Escape.
    await page.keyboard.press('Escape');

    // Expected: panel is no longer visible.
    await expect(panel(page)).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-12 | Media | Cerrar el panel haciendo click en el backdrop
  // Validar que al hacer click en el área oscura fuera del panel, éste
  // se cierre correctamente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-12 — cierra el CustomizePanel haciendo click en el backdrop', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.user);
    await openCustomizePanel(page);

    // Step 3 – Click the backdrop overlay (outside the panel drawer).
    await page.locator('[class*="backdrop"]').click({ force: true });

    // Expected: panel closes.
    await expect(panel(page)).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-13 | Alta | Links en OverdueCard navegan al backlog del ítem
  // Validar que al hacer click en un ítem de la tarjeta "Ítems vencidos"
  // el sistema navegue al backlog del proyecto correspondiente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-13 — los links de OverdueCard navegan al backlog del proyecto', async ({ page }) => {
    // Step 1 – Navigate to the user dashboard.
    await goToDashboard(page, URLS.user);

    // Step 2 – Verify the "Ítems vencidos" card is rendered.
    // Scope to the card heading to avoid strict-mode violation (the text also
    // appears inside ancestor wrapper divs and stat labels).
    await expect(page.locator('h3').filter({ hasText: /^Ítems vencidos$/ })).toBeVisible({ timeout: 8_000 });

    // Step 3 – Check whether any overdue items are listed.
    const overdueLink = page.locator('h3:text("Ítems vencidos") ~ * a[class*="overdueItemName"], h3:text("Ítems vencidos") + * a').first();
    const anyVisible  = await page.locator('[class*="overdueList"] a').first().isVisible().catch(() => false);

    if (!anyVisible) {
      // Expected (empty state): positive message is shown instead.
      await expect(page.getByText('Sin ítems vencidos')).toBeVisible({ timeout: 5_000 });
      return;
    }

    // Step 4 – Click the first overdue item link.
    await page.locator('[class*="overdueList"] a').first().click();

    // Expected: navigates to a backlog URL with the project and item IDs.
    await page.waitForURL(/\/proyectos\/\d+\/backlog/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/proyectos\/\d+\/backlog/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-14 | Alta | Links en UpcomingCard navegan al backlog del ítem
  // Validar que al hacer click en un ítem de la tarjeta "Próximos vencimientos"
  // el sistema navegue al backlog del proyecto correspondiente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-14 — los links de UpcomingCard navegan al backlog del proyecto', async ({ page }) => {
    // Step 1 – Navigate to the user dashboard.
    await goToDashboard(page, URLS.user);

    // Step 2 – Verify the "Próximos vencimientos" card is rendered.
    await expect(page.getByText('Próximos vencimientos')).toBeVisible({ timeout: 8_000 });

    // Step 3 – Check whether any upcoming items are listed.
    const anyVisible = await page.locator('[class*="overdueList"] a').nth(1).isVisible().catch(() => false);

    if (!anyVisible) {
      await expect(page.getByText('Sin vencimientos próximos')).toBeVisible({ timeout: 5_000 });
      return;
    }

    // Step 4 – Click the first upcoming item link.
    // UpcomingCard is typically rendered after OverdueCard — use the second group of links.
    const upcomingSection = page.getByText('Próximos vencimientos').locator('xpath=ancestor::*[contains(@class,"card")]');
    await upcomingSection.locator('a').first().click();

    // Expected: navigates to the backlog with the project and item IDs.
    await page.waitForURL(/\/proyectos\/\d+\/backlog/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/proyectos\/\d+\/backlog/);
  });
});

// ---------------------------------------------------------------------------
// ── 2. DASHBOARD DE PROYECTOS (/dashboard-proyectos) ─────────────────────
// ---------------------------------------------------------------------------

test.describe('Dashboard — Proyectos (/dashboard-proyectos)', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with a valid account.
  // • If the account has PM role in any project, the dashboard renders with graphs.
  //   Otherwise the empty-state message is shown.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-15 | Alta | Renderizado del dashboard de proyectos
  // Validar que la página cargue correctamente: si el usuario es PM de algún
  // proyecto, se muestra el dashboard; de lo contrario aparece el estado vacío.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-15 — la página carga con el dashboard o el estado vacío de PM', async ({ page }) => {
    // Step 1 – Navigate to the projects dashboard.
    await page.goto(URLS.project);

    // Expected A: if the user is PM in any project, the Personalizar button appears.
    // Expected B: if not a PM, the informative message is shown.
    const isPM = await page.getByRole('button', { name: 'Personalizar' }).isVisible({ timeout: 15_000 }).catch(() => false);
    if (isPM) {
      await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible();
      await expect(page.getByText('Dashboard de Proyectos')).toBeVisible();
    } else {
      await expect(page.getByText('No tienes rol de PM en ningún proyecto.')).toBeVisible({ timeout: 15_000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-16 | Alta | Apertura del CustomizePanel en el dashboard de proyectos
  // Validar que el panel de personalización se abra correctamente
  // (solo aplica si el usuario tiene rol PM).
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-16 — el botón Personalizar abre el panel (si el usuario es PM)', async ({ page }) => {
    // Step 1 – Navigate.
    await page.goto(URLS.project);
    const isPM = await page.getByRole('button', { name: 'Personalizar' }).isVisible({ timeout: 15_000 }).catch(() => false);

    if (!isPM) {
      test.skip();
      return;
    }

    // Step 2 – Open the customize panel.
    await openCustomizePanel(page);

    // Expected: panel is visible with graph cards listed.
    await expect(panel(page)).toBeVisible();
    await expect(firstCard(page).locator('input[type="checkbox"]')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-17 | Media | Ocultar y mostrar gráfica en el dashboard de proyectos
  // Validar que el checkbox de una gráfica permita ocultarla y restaurarla.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-17 — oculta y restaura una gráfica en el dashboard de proyectos', async ({ page }) => {
    await page.goto(URLS.project);
    const isPM = await page.getByRole('button', { name: 'Personalizar' }).isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isPM) { test.skip(); return; }

    await openCustomizePanel(page);

    const cb = firstCard(page).locator('input[type="checkbox"]');
    if (!(await cb.isChecked())) await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });

    // Hide
    await cb.click();
    await expect(cb).not.toBeChecked({ timeout: 5_000 });

    // Restore
    await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-18 | Alta | Modo reorganización en el dashboard de proyectos
  // Validar que el modo de reorganización active los drag handles en la grilla.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-18 — entra y sale del modo reorganización en el dashboard de proyectos', async ({ page }) => {
    await page.goto(URLS.project);
    const isPM = await page.getByRole('button', { name: 'Personalizar' }).isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isPM) { test.skip(); return; }

    // Enter reorganize mode
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Exit
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Salir de reorganización' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-19 | Media | Mover una gráfica en el dashboard de proyectos
  // Validar que en modo reorganización las gráficas puedan arrastrarse.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-19 — arrastra una gráfica en el dashboard de proyectos', async ({ page }) => {
    await page.goto(URLS.project);
    const isPM = await page.getByRole('button', { name: 'Personalizar' }).isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isPM) { test.skip(); return; }

    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    const handle = page.locator('[class*="dragHandle"]').first();
    const box    = await handle.boundingBox();
    if (!box) throw new Error('No drag handle bounding box');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('[class*="gridItem"]').first()).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// ── 3. DASHBOARD ADMINISTRATIVO (/dashboard-admin) ───────────────────────
// ---------------------------------------------------------------------------

test.describe('Dashboard — Admin (/dashboard-admin)', () => {
  test.use({ storageState: path.resolve(__dirname, '../.auth/session.json') });

  // ── Pre-conditions ───────────────────────────────────────────────────────
  // • Logged in with an administrator account.
  // • /dashboard-admin is only accessible for the admin role.

  // ─────────────────────────────────────────────────────────────────────────
  // TC-20 | Alta | Renderizado del dashboard administrativo con estadísticas
  // Validar que la página muestre el encabezado, las cuatro tarjetas de
  // estadísticas y los botones de acción al cargar.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-20 — renderiza encabezado, estadísticas y botones de acción', async ({ page }) => {
    // Step 1 – Navigate.
    await goToDashboard(page, URLS.admin);

    // Expected: page title – scope to the p.title element to avoid matching the
    // sidebar navigation link (both contain "Dashboard administrativo").
    await expect(page.locator('p[class*="title"]').filter({ hasText: 'Dashboard administrativo' })).toBeVisible();

    // Expected: stat cards – scope to the stats row to avoid matching OverdueCard
    // headings and ancestor wrapper elements.
    const statsRow = page.locator('[class*="statRow"], [class*="statsGroup"], [class*="statsRow"]').first();
    await expect(statsRow.getByText('Proyectos activos', { exact: true })).toBeVisible();
    await expect(statsRow.getByText('Ítems totales',     { exact: true })).toBeVisible();
    await expect(statsRow.getByText('Sprints activos',   { exact: true })).toBeVisible();
    await expect(statsRow.getByText('Ítems vencidos',    { exact: true })).toBeVisible();

    // Expected: action buttons.
    await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generar reporte', exact: true })).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-21 | Alta | Apertura del CustomizePanel desde el dashboard admin
  // Validar que el botón "Personalizar" abra el panel con la lista de gráficas.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-21 — el botón Personalizar abre el CustomizePanel', async ({ page }) => {
    // Step 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);

    // Expected: panel is visible with graph cards.
    await expect(panel(page)).toBeVisible();
    await expect(firstCard(page).locator('input[type="checkbox"]')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-22 | Alta | Ocultar y mostrar gráfica en el dashboard admin
  // Validar que el checkbox oculte y restaure una gráfica correctamente.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-22 — oculta y restaura una gráfica vía checkbox', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);

    const cb = firstCard(page).locator('input[type="checkbox"]');
    if (!(await cb.isChecked())) await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });

    // Hide.
    await cb.click();
    await expect(cb).not.toBeChecked({ timeout: 5_000 });

    // Restore.
    await cb.click();
    await expect(cb).toBeChecked({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-23 | Alta | Toggle de visibilidad en el panel derecho (admin)
  // Validar que el toggle VISIBLE del panel derecho cambie el estado de la
  // gráfica seleccionada.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-23 — el toggle de visibilidad en el panel derecho cambia el estado', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);

    await firstCard(page).click();
    await expect(visibilityToggle(page)).toBeVisible({ timeout: 5_000 });

    const before = await visibilityToggle(page).getAttribute('aria-checked');
    await visibilityToggle(page).click();
    const after = await visibilityToggle(page).getAttribute('aria-checked');
    expect(after).not.toBe(before);

    // Restore.
    await visibilityToggle(page).click();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-24 | Alta | Entrar y salir del modo reorganización (admin)
  // Validar que "Reorganizar gráficas" active los drag handles y
  // "Salir de reorganización" los desactive.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-24 — entra y sale del modo reorganización en el dashboard admin', async ({ page }) => {
    // Step 1 – Navigate.
    await goToDashboard(page, URLS.admin);

    // Step 2 – Enter reorganize mode.
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 3 – Exit reorganize mode.
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Salir de reorganización' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).not.toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-25 | Alta | Mover una gráfica arrastrando en el dashboard admin
  // Validar que en modo reorganización sea posible arrastrar una gráfica
  // a una posición diferente en la grilla.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-25 — arrastra una gráfica a una nueva posición en el admin', async ({ page }) => {
    // Step 1 – Navigate and enter reorganize mode.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 2 – Drag the first handle 200px right.
    const handle = page.locator('[class*="dragHandle"]').first();
    const box    = await handle.boundingBox();
    if (!box) throw new Error('No drag handle bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy, { steps: 10 });
    await page.mouse.up();

    // Expected: the grid item is still visible (no crash after drag).
    await expect(page.locator('[class*="gridItem"]').first()).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-26 | Alta | Redimensionar una gráfica en el dashboard admin
  // Validar que en modo reorganización sea posible redimensionar una gráfica
  // usando el controlador de resize de la esquina inferior-derecha.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-26 — redimensiona una gráfica en el dashboard admin', async ({ page }) => {
    // Step 1 – Navigate and enter reorganize mode.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);
    await page.getByRole('button', { name: 'Reorganizar gráficas' }).click();
    await expect(page.locator('[class*="dragHandle"]').first()).toBeVisible({ timeout: 8_000 });

    // Step 2 – Hover over the first grid item to reveal the resize handle.
    await page.locator('[class*="gridItem"]').first().hover();
    const resizeHandle = page.locator('.react-resizable-handle-se').first();
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('No resize handle bounding box');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Step 3 – Drag the resize handle 80px right and 40px down.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 40, { steps: 10 });
    await page.mouse.up();

    // Expected: grid item still visible (resize did not crash the app).
    await expect(page.locator('[class*="gridItem"]').first()).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-27 | Media | Búsqueda de gráfica en el panel (admin)
  // Validar que el campo de búsqueda filtre correctamente las gráficas.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-27 — la búsqueda filtra gráficas en el panel del dashboard admin', async ({ page }) => {
    // Steps 1-2 – Navigate and open the panel.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);

    const firstLabel = await panel(page).locator('[class*="cardLabel"]').first().textContent() ?? '';
    const searchInput = panel(page).locator('input[placeholder="Buscar gráfica…"]');

    // Search with a matching term.
    await searchInput.fill(firstLabel.slice(0, 4));
    await expect(panel(page).locator('[class*="cardLabel"]').first()).toBeVisible({ timeout: 5_000 });

    // Search with a non-matching term.
    await searchInput.fill('zzzznoexiste');
    await expect(panel(page).getByText('Sin resultados.')).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-28 | Baja | Cerrar el panel con Escape (admin)
  // Validar que la tecla Escape cierre el CustomizePanel.
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-28 — cierra el CustomizePanel con Escape en el dashboard admin', async ({ page }) => {
    // Steps 1-2 – Navigate and open.
    await goToDashboard(page, URLS.admin);
    await openCustomizePanel(page);

    // Step 3 – Press Escape.
    await page.keyboard.press('Escape');

    // Expected: panel is gone.
    await expect(panel(page)).not.toBeVisible({ timeout: 5_000 });
  });
});
