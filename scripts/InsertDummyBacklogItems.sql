-- ── backlog_item dummy data ───────────────────────────────────────
-- 57 items spread across all 4 projects, all 9 sprints
--
-- id_usuario_responsable = 1  → visible on user dashboard (27 items)
-- id_usuario_responsable = NULL → 4 unassigned items
--
-- Dashboard coverage:
--   Status donut   : Por Hacer(5), En Progreso(9), En Revisión(5), Acabado(8)
--   Hours by sprint: all 9 sprints have at least one item with tiempo
--   Items by type  : all 5 types represented
--   Priority bar   : all 5 priorities represented
--   Complexity bar : complejidad 1–5 all used
--   Overdue        : ids 4,9,12,16  (past due 2026-05-10…17, non-terminal)
--   This week      : items due 2026-05-18..22 (Mon-Fri) — 22 items across 4 projects
--
-- Progresión semanal — pace per project vs. the Wednesday mark (~60% expected):
--   Proyecto Alpha : 4/5 completados (80%) → adelantado
--   Proyecto Gamma : 3/5 completados (60%) → en tiempo
--   Proyecto Delta : 3/5 completados (60%) → en tiempo
--   Proyecto Beta  : 2/7 completados (29%) → atrasado
--
-- fecha_completado spread (terminal Acabado items only):
--   Before due date : ids 3, 23, 29, 43, 52, 57
--   At    due date  : ids 8, 24, 46, 55
--   After due date  : ids 26, 30, 32, 49, 56
--
-- Inserted top-down (roots first) — SET CONSTRAINTS ALL DEFERRED used anyway.

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO backlog_item (
  id, nombre, descripcion, fecha_creacion,
  id_tipo, id_estatus, id_prioridad, id_sprint,
  id_proyecto, id_usuario_creador, id_usuario_responsable,
  id_backlog_item_padre, es_terminal,
  complejidad, tiempo, tiempo_estimado, fecha_vencimiento,
  fecha_completado
)
OVERRIDING SYSTEM VALUE VALUES

  -- ── Proyecto 1 (Alpha) — Sprints 1-3 ──────────────────────────

  -- Épica raíz (id=2) — no parent
  (2,  'Épica: Módulo de autenticación',
       'Agrupa todas las historias y tareas del sistema de login.',
       NOW(), 4, 2, 1, 3, 1, 1, 1,    NULL, false, 5, 2400, 2000, NULL, NULL),

  -- HU (id=1) — parent: Épica id=2
  (1,  'Como usuario quiero iniciar sesión',
       'Implementar flujo de autenticación con email y contraseña.',
       NOW(), 1, 2, 2, 1, 1, 1, 1,    2,    false, 3,  480,  420, '2026-05-21', NULL),

  -- Tarea (id=3) — parent: HU id=1  [BEFORE: due 05-19 → completed 05-15]
  (3,  'Configurar conexión a Supabase',
       'Instalar cliente y definir variables de entorno.',
       NOW(), 2, 4, 3, 1, 1, 1, 1,    1,    true,  2,  120,  150, '2026-05-19', '2026-05-15 10:30:00+00'),

  -- Bug (id=4) — parent: HU id=1
  (4,  'Fix: token expirado no redirige al login',
       'Al expirar la sesión el usuario ve pantalla en blanco.',
       NOW(), 3, 3, 2, 2, 1, 1, 1,    1,    false, 2,   90,  120, '2026-05-10', NULL),

  -- Subtarea (id=5) — parent: Tarea id=3
  (5,  'Diseñar componente BacklogListItem',
       'Crear el componente visual para listar ítems del backlog.',
       NOW(), 5, 1, 4, 2, 1, 1, 1,    3,    false, 1,   60,   60, '2026-05-27', NULL),

  -- ── Proyecto 2 (Beta) — Sprints 4-5 ───────────────────────────

  -- HU (id=6) — no parent
  (6,  'Como usuario quiero exportar reportes',
       'Generar reportes de avance del proyecto en PDF.',
       NOW(), 1, 1, 3, 4, 2, 1, 1,    NULL, false, 3,  240,  300, '2026-05-20', NULL),

  -- Tarea (id=7) — parent: HU id=6
  (7,  'Crear endpoint de exportación PDF',
       'Implementar ruta en Express que retorne el PDF generado.',
       NOW(), 2, 2, 2, 5, 2, 1, 1,    6,    false, 3,  300,  270, NULL, NULL),

  -- Bug (id=8) — no parent  [AT: no due → completed 05-12]
  (8,  'Fix: gráfica no carga en Safari',
       'El componente de Chart.js no renderiza en Safari 17.',
       NOW(), 3, 4, 1, 4, 2, 1, 1,    NULL, true,  2,  150,  180, NULL, '2026-05-12 14:00:00+00'),

  -- Subtarea (id=9) — parent: Tarea id=7
  (9,  'Integrar librería de generación de PDF',
       'Evaluar y configurar pdfmake o puppeteer.',
       NOW(), 5, 3, 5, 5, 2, 1, 1,    7,    false, 2,  120,   90, '2026-05-14', NULL),

  -- ── Proyecto 3 (Gamma) — Sprints 6-7 ──────────────────────────

  -- Épica raíz (id=10) — no parent
  (10, 'Épica: Módulo de pagos',
       'Integración completa con pasarela de pagos externa.',
       NOW(), 4, 1, 1, 6, 3, 1, 1,    NULL, false, 5, 1800, 2400, NULL, NULL),

  -- HU (id=11) — parent: Épica id=10
  (11, 'Como usuario quiero pagar con tarjeta',
       'Implementar flujo de pago con Stripe.',
       NOW(), 1, 2, 2, 6, 3, 1, 1,    10,   false, 4,  480,  360, '2026-05-22', NULL),

  -- Bug (id=12) — no parent
  (12, 'Fix: webhook de pago genera duplicados',
       'El evento payment_intent.succeeded se procesa dos veces.',
       NOW(), 3, 1, 1, 7, 3, 1, 1,    NULL, false, 3,  180,  120, '2026-05-16', NULL),

  -- Tarea (id=13) — parent: HU id=11
  (13, 'Validar tarjetas de crédito en frontend',
       'Integrar Stripe Elements para validación en tiempo real.',
       NOW(), 2, 4, 3, 7, 3, 1, 1,    11,   false, 2,  240,  300, NULL, NULL),

  -- ── Proyecto 4 (Delta) — Sprints 8-9 ──────────────────────────

  -- Épica raíz (id=18) — no parent
  (18, 'Épica: App móvil offline-first',
       'Permitir operación sin conexión con sync posterior.',
       NOW(), 4, 2, 2, 8, 4, 1, 1,    NULL, false, 5, 2400, 3000, NULL, NULL),

  -- HU (id=14) — parent: Épica id=18
  (14, 'Como usuario quiero ver inventario sin red',
       'Cache local de ítems con IndexedDB.',
       NOW(), 1, 2, 4, 8, 4, 1, 1,    18,   false, 4,  360,  480, NULL, NULL),

  -- Tarea (id=15) — parent: HU id=14
  (15, 'Crear formulario de registro de inventario',
       'Form nativo con validaciones y persistencia local.',
       NOW(), 2, 2, 3, 8, 4, 1, 1,    14,   false, 3,  420,  360, '2026-05-28', NULL),

  -- Bug (id=16) — no parent
  (16, 'Fix: sync falla al reconectar WiFi',
       'El proceso de reconciliación lanza excepción en Android 14.',
       NOW(), 3, 1, 2, 9, 4, 1, 1,    NULL, false, 3, NULL,  240, '2026-05-17', NULL),

  -- Subtarea (id=17) — parent: Tarea id=15
  (17, 'Diseñar modelo de datos para modo offline',
       'Definir esquema de IndexedDB y estrategia de conflictos.',
       NOW(), 5, 3, 5, 9, 4, 1, 1,    15,   false, 1,   90,  120, '2026-06-01', NULL),

  -- ── Sin responsable ────────────────────────────────────────────

  -- HU (id=19) — no parent
  (19, 'Como usuario quiero ver mi perfil',
       'Mostrar datos personales y avatar del usuario autenticado.',
       NOW(), 1, 1, 4, 1, 1, 1, NULL, NULL, false, 2,  240,  180, NULL, NULL),

  -- Tarea (id=20) — parent: HU id=19
  (20, 'Crear estructura de carpetas del proyecto',
       'Definir árbol de directorios siguiendo feature-based arch.',
       NOW(), 2, 1, 3, 2, 1, 1, NULL, 19,   false, 1,   60,   90, NULL, NULL),

  -- Subtarea (id=21) — parent: Tarea id=20
  (21, 'Conectar hook useBacklogItems a la vista',
       'Integrar el hook con el componente de lista del backlog.',
       NOW(), 5, 3, 2, 2, 1, 1, NULL, 20,   false, 3,  150,  120, NULL, NULL),

  -- Bug (id=22) — no parent
  (22, 'Fix: avatar no carga en Firefox',
       'La imagen SVG del avatar no renderiza correctamente.',
       NOW(), 3, 3, 3, 2, 1, 1, NULL, NULL, false, 2,   90,   60, NULL, NULL),

  -- ── Esta semana (2026-05-18..24) — Proyecto 1 Alpha ───────────────

  -- Acabado ✓  [BEFORE: due 05-19 → completed 05-17]
  (23, 'Implementar refresh de token automático',
       'Renovar el JWT silenciosamente antes de que expire.',
       NOW(), 2, 4, 2, 1, 1, 1, 1,    NULL, true,  3,  180,  150, '2026-05-19', '2026-05-17 09:15:00+00'),

  -- Acabado ✓  [AT: due 05-20 → completed 05-20]
  (24, 'Añadir tests unitarios al middleware de auth',
       'Cubrir los casos de token inválido y expirado.',
       NOW(), 2, 4, 3, 2, 1, 1, 1,    NULL, true,  2,  120,   90, '2026-05-20', '2026-05-20 16:45:00+00'),

  -- En Revisión
  (25, 'Revisar política de CORS en producción',
       'Verificar orígenes permitidos y cabeceras expuestas.',
       NOW(), 2, 3, 2, 3, 1, 1, 1,    NULL, false, 2,   90,  120, '2026-05-28', NULL),

  -- ── Esta semana — Proyecto 2 Beta ─────────────────────────────────

  -- Acabado ✓  [AFTER: due 05-18 → completed 05-21]
  (26, 'Completar integración con API de reportes',
       'Conectar endpoint /reports al servicio de generación PDF.',
       NOW(), 2, 4, 3, 4, 2, 1, 1,    NULL, true,  3,  200,  240, '2026-05-18', '2026-05-21 11:30:00+00'),

  -- En Progreso
  (27, 'Diseñar plantilla HTML para el reporte',
       'Crear la maqueta base que puppeteer convertirá a PDF.',
       NOW(), 2, 2, 2, 5, 2, 1, 1,    NULL, false, 2,  150,  120, '2026-05-21', NULL),

  -- En Revisión
  (28, 'Validar permisos de descarga por rol',
       'Solo managers y admins pueden exportar reportes completos.',
       NOW(), 2, 3, 4, 4, 2, 1, 1,    NULL, false, 2,   60,   90, '2026-05-22', NULL),

  -- ── Esta semana — Proyecto 3 Gamma ────────────────────────────────

  -- Acabado ✓  [BEFORE: due 05-19 → completed 05-18]
  (29, 'Crear hook usePagoStatus',
       'Hook que suscribe al estado del pago en tiempo real.',
       NOW(), 2, 4, 2, 6, 3, 1, 1,    NULL, true,  3,  160,  180, '2026-05-19', '2026-05-18 13:00:00+00'),

  -- Acabado ✓  [AFTER: due 05-20 → completed 05-22]
  (30, 'Implementar retry automático en webhook',
       'Reintentar hasta 3 veces con backoff exponencial.',
       NOW(), 3, 4, 1, 7, 3, 1, 1,    NULL, true,  3,  210,  240, '2026-05-20', '2026-05-22 10:00:00+00'),

  -- En Progreso
  (31, 'Agregar loading state al formulario de pago',
       'Deshabilitar botón y mostrar spinner durante el proceso.',
       NOW(), 5, 2, 3, 6, 3, 1, 1,    NULL, false, 1,   45,   60, '2026-05-21', NULL),

  -- ── Esta semana — Proyecto 4 Delta ────────────────────────────────

  -- Acabado ✓  [AFTER: due 05-18 → completed 05-19]
  (32, 'Escribir lógica de reconciliación de conflictos',
       'Estrategia last-write-wins para conflictos de sync.',
       NOW(), 2, 4, 2, 8, 4, 1, 1,    NULL, true,  4,  300,  360, '2026-05-18', '2026-05-19 17:00:00+00'),

  -- En Progreso
  (33, 'Implementar cola de operaciones pendientes',
       'Persistir acciones offline y reproducirlas al reconectar.',
       NOW(), 2, 2, 3, 9, 4, 1, 1,    NULL, false, 4,  360,  300, '2026-05-21', NULL),

  -- En Revisión
  (34, 'Probar sync en red 2G simulada',
       'Validar que la cola no se corrompe con latencia alta.',
       NOW(), 5, 3, 4, 9, 4, 1, 1,    NULL, false, 2,  120,   90, '2026-05-22', NULL),

  -- ── Vencidos adicionales — Presión de backlog ──────────────────
  --    (non-terminal, fecha_vencimiento < 2026-05-18)

  -- Proyecto 1 (Alpha)
  (35, 'Implementar recuperación de contraseña',
       'Flujo completo de reset via email con enlace firmado.',
       NOW(), 1, 2, 1, 1, 1, 1, 1,    NULL, false, 4, NULL,  480, '2026-05-07', NULL),

  (36, 'Fix: sesión no persiste tras recargar la página',
       'El store de Zustand pierde el token al hacer F5.',
       NOW(), 3, 1, 2, 2, 1, 1, 1,    NULL, false, 3, NULL,  180, '2026-05-12', NULL),

  -- Proyecto 2 (Beta)
  (37, 'Migrar pipeline de CI a GitHub Actions',
       'Reemplazar Jenkins con workflows de GitHub Actions.',
       NOW(), 2, 3, 1, 4, 2, 1, 1,    NULL, false, 5, NULL,  600, '2026-05-02', NULL),

  (38, 'Fix: paginación rompe el filtro activo',
       'Al cambiar de página se pierden los filtros aplicados.',
       NOW(), 3, 2, 2, 5, 2, 1, 1,    NULL, false, 3, NULL,  240, '2026-05-13', NULL),

  -- Proyecto 3 (Gamma)
  (39, 'Diseñar flujo de reembolso automático',
       'Lógica de reversa de cobro cuando el pago falla post-captura.',
       NOW(), 1, 1, 1, 6, 3, 1, 1,    NULL, false, 4, NULL,  360, '2026-05-09', NULL),

  (40, 'Agregar soporte para pagos en cuotas',
       'Integrar opciones de MSI con Stripe y Conekta.',
       NOW(), 2, 2, 3, 7, 3, 1, 1,    NULL, false, 2, NULL,  150, '2026-05-15', NULL),

  -- Proyecto 4 (Delta)
  (41, 'Implementar autenticación biométrica offline',
       'Permitir login con huella cuando no hay conexión.',
       NOW(), 1, 3, 1, 8, 4, 1, 1,    NULL, false, 5, NULL,  720, '2026-05-05', NULL),

  (42, 'Fix: conflicto de timestamps en zona horaria',
       'Items creados en UTC-5 llegan desordenados al servidor.',
       NOW(), 3, 1, 2, 9, 4, 1, 1,    NULL, false, 3, NULL,  300, '2026-05-14', NULL),

  -- ── Esta semana adicional — Progresión semanal ─────────────────
  --    (vencimientos 05-18..22; ids 44,45,50,51,53,54 empujados a 05-28..30)

  -- Proyecto 1 (Alpha)
  -- Acabado ✓  [BEFORE: due 05-19 → completed 05-18]
  (43, 'Añadir 2FA con TOTP',
       'Integrar autenticador de dos factores con librería otplib.',
       NOW(), 1, 4, 2, 1, 1, 1, 1,    NULL, true,  3,  200,  240, '2026-05-19', '2026-05-18 08:30:00+00'),

  (44, 'Revisar expiración de sesiones inactivas',
       'Cerrar sesión automáticamente tras 30 min sin actividad.',
       NOW(), 2, 2, 3, 2, 1, 1, 1,    NULL, false, 2, NULL,  120, '2026-05-28', NULL),

  (45, 'Documentar endpoints de autenticación',
       'Generar especificación OpenAPI para el módulo de auth.',
       NOW(), 2, 1, 4, 3, 1, 1, 1,    NULL, false, 1, NULL,   90, '2026-05-29', NULL),

  -- Proyecto 2 (Beta)
  -- Acabado ✓  [AT: due 05-18 → completed 05-18]
  (46, 'Agregar filtro de fecha al listado de reportes',
       'Rango de fechas tipo datepicker para filtrar historial.',
       NOW(), 2, 4, 3, 4, 2, 1, 1,    NULL, true,  2,  110,   90, '2026-05-18', '2026-05-18 15:00:00+00'),

  (47, 'Crear vista previa del reporte antes de exportar',
       'Modal con preview HTML antes de generar el PDF.',
       NOW(), 1, 3, 2, 5, 2, 1, 1,    NULL, false, 3, NULL,  300, '2026-05-21', NULL),

  (48, 'Comprimir imágenes incluidas en el reporte PDF',
       'Reducir tamaño de archivo optimizando assets embebidos.',
       NOW(), 2, 2, 4, 4, 2, 1, 1,    NULL, false, 4, NULL,  480, '2026-05-22', NULL),

  -- Proyecto 3 (Gamma)
  -- Acabado ✓  [AFTER: due 05-19 → completed 05-20]
  (49, 'Crear pantalla de confirmación de pago exitoso',
       'Vista post-pago con resumen de transacción y botón de inicio.',
       NOW(), 1, 4, 2, 6, 3, 1, 1,    NULL, true,  2,  130,  120, '2026-05-19', '2026-05-20 14:00:00+00'),

  (50, 'Agregar notificación push al confirmar pago',
       'Enviar push notification al usuario cuando el cobro se aprueba.',
       NOW(), 2, 1, 3, 7, 3, 1, 1,    NULL, false, 3, NULL,  210, '2026-05-28', NULL),

  (51, 'Validar RFC en formulario de facturación',
       'Verificar formato de RFC mexicano antes de emitir CFDI.',
       NOW(), 2, 3, 2, 6, 3, 1, 1,    NULL, false, 2, NULL,  150, '2026-05-29', NULL),

  -- Proyecto 4 (Delta)
  -- Acabado ✓  [BEFORE: due 05-18 → completed 05-17]
  (52, 'Comprimir payload de sync para reducir uso de datos',
       'Aplicar gzip al body de la petición de sincronización.',
       NOW(), 2, 4, 2, 8, 4, 1, 1,    NULL, true,  3,  190,  240, '2026-05-18', '2026-05-17 16:00:00+00'),

  (53, 'Implementar indicador visual de estado de conexión',
       'Banner que avise al usuario cuando está en modo offline.',
       NOW(), 2, 2, 3, 9, 4, 1, 1,    NULL, false, 4, NULL,  420, '2026-05-29', NULL),

  (54, 'Añadir tests de integración para la cola offline',
       'Verificar que las operaciones pendientes se replican correctamente.',
       NOW(), 2, 1, 4, 8, 4, 1, 1,    NULL, false, 2, NULL,  180, '2026-05-30', NULL),

  -- ── Completados para gráfica de precisión — complejidad 1 y 5 ────

  -- Complejidad 1 — bajo estimado (real < estimado)  [AT: due 05-17 → completed 05-17]
  (55, 'Actualizar texto de botón de cancelar',
       'Cambiar label de "Cancelar" a "Volver" en el modal de confirmación.',
       NOW(), 2, 4, 4, 1, 1, 1, 1,    NULL, true,  1,   20,   30, '2026-05-17', '2026-05-17 11:00:00+00'),

  -- Complejidad 5 — sobreestimado (real > estimado)  [AFTER: due 05-16 → completed 05-18]
  (56, 'Implementar sistema de caché distribuido',
       'Integrar Redis para cachear sesiones y reducir carga en DB.',
       NOW(), 2, 4, 1, 3, 1, 1, 1,    NULL, true,  5,  600,  480, '2026-05-16', '2026-05-18 13:00:00+00'),

  -- Complejidad 4 extra — refuerzo de datos  [BEFORE: due 05-19 → completed 05-14]
  (57, 'Migrar base de datos a esquema multi-tenant',
       'Agregar campo id_tenant y actualizar todas las políticas RLS.',
       NOW(), 2, 4, 1, 8, 4, 1, 1,    NULL, true,  4,  400,  420, '2026-05-19', '2026-05-14 10:00:00+00')

ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('backlog_item', 'id'),
  (SELECT MAX(id) FROM backlog_item)
);

-- Fix es_terminal and fecha_completado on items already in DB
-- (ON CONFLICT DO NOTHING above won't update them)
UPDATE backlog_item
SET
  es_terminal = true,
  fecha_completado = CASE id
    -- BEFORE due date
    WHEN  3 THEN '2026-05-15 10:30:00+00'::TIMESTAMPTZ
    WHEN 23 THEN '2026-05-17 09:15:00+00'::TIMESTAMPTZ
    WHEN 29 THEN '2026-05-18 13:00:00+00'::TIMESTAMPTZ
    WHEN 43 THEN '2026-05-18 08:30:00+00'::TIMESTAMPTZ
    WHEN 52 THEN '2026-05-17 16:00:00+00'::TIMESTAMPTZ
    WHEN 57 THEN '2026-05-14 10:00:00+00'::TIMESTAMPTZ
    -- AT due date
    WHEN  8 THEN '2026-05-12 14:00:00+00'::TIMESTAMPTZ
    WHEN 24 THEN '2026-05-20 16:45:00+00'::TIMESTAMPTZ
    WHEN 46 THEN '2026-05-18 15:00:00+00'::TIMESTAMPTZ
    WHEN 55 THEN '2026-05-17 11:00:00+00'::TIMESTAMPTZ
    -- AFTER due date
    WHEN 26 THEN '2026-05-21 11:30:00+00'::TIMESTAMPTZ
    WHEN 30 THEN '2026-05-22 10:00:00+00'::TIMESTAMPTZ
    WHEN 32 THEN '2026-05-19 17:00:00+00'::TIMESTAMPTZ
    WHEN 49 THEN '2026-05-20 14:00:00+00'::TIMESTAMPTZ
    WHEN 56 THEN '2026-05-18 13:00:00+00'::TIMESTAMPTZ
  END
WHERE id IN (3, 8, 23, 24, 26, 29, 30, 32, 43, 46, 49, 52, 55, 56, 57)
  AND id_estatus = 4;

-- Re-balance fecha_vencimiento so the Progresión Semanal card shows a clear
-- spread: Alpha ahead, Gamma/Delta on schedule, Beta behind. Needed because the
-- ON CONFLICT DO NOTHING insert above won't update rows already in the DB.
UPDATE backlog_item
SET fecha_vencimiento = CASE id
  -- pulled into this week (Mon-Fri 2026-05-18..22)
  WHEN  3 THEN '2026-05-19'::DATE
  WHEN 57 THEN '2026-05-19'::DATE
  -- pushed past this week to balance each project's weekly pace
  WHEN 25 THEN '2026-05-28'::DATE
  WHEN 44 THEN '2026-05-28'::DATE
  WHEN 45 THEN '2026-05-29'::DATE
  WHEN 15 THEN '2026-05-28'::DATE
  WHEN 50 THEN '2026-05-28'::DATE
  WHEN 51 THEN '2026-05-29'::DATE
  WHEN 53 THEN '2026-05-29'::DATE
  WHEN 54 THEN '2026-05-30'::DATE
END
WHERE id IN (3, 15, 25, 44, 45, 50, 51, 53, 54, 57);

COMMIT;
