-- ── backlog_item dummy data ───────────────────────────────────────
-- 31 items spread across all 4 projects, all 9 sprints
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
--   Overdue        : ids 4,9,12,16  (past due 2026-05-03…10, non-terminal)
--   This week      : ids 1,6,11,15,23-34  (2026-05-11..15 Mon-Fri, ~half completed)
--
-- Inserted top-down (roots first) — SET CONSTRAINTS ALL DEFERRED used anyway.

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO backlog_item (
  id, nombre, descripcion, fecha_creacion,
  id_tipo, id_estatus, id_prioridad, id_sprint,
  id_proyecto, id_usuario_creador, id_usuario_responsable,
  id_backlog_item_padre, es_terminal,
  complejidad, tiempo, fecha_vencimiento
)
OVERRIDING SYSTEM VALUE VALUES

  -- ── Proyecto 1 (Alpha) — Sprints 1-3 ──────────────────────────

  -- Épica raíz (id=2) — no parent
  (2,  'Épica: Módulo de autenticación',
       'Agrupa todas las historias y tareas del sistema de login.',
       NOW(), 4, 2, 1, 3, 1, 1, 1,    NULL, false, 5, 2400, NULL),

  -- HU (id=1) — parent: Épica id=2
  (1,  'Como usuario quiero iniciar sesión',
       'Implementar flujo de autenticación con email y contraseña.',
       NOW(), 1, 2, 2, 1, 1, 1, 1,    2,    false, 3,  480, '2026-05-14'),

  -- Tarea (id=3) — parent: HU id=1
  (3,  'Configurar conexión a Supabase',
       'Instalar cliente y definir variables de entorno.',
       NOW(), 2, 4, 3, 1, 1, 1, 1,    1,    false, 2,  120, NULL),

  -- Bug (id=4) — parent: HU id=1
  (4,  'Fix: token expirado no redirige al login',
       'Al expirar la sesión el usuario ve pantalla en blanco.',
       NOW(), 3, 3, 2, 2, 1, 1, 1,    1,    false, 2,   90, '2026-05-03'),

  -- Subtarea (id=5) — parent: Tarea id=3
  (5,  'Diseñar componente BacklogListItem',
       'Crear el componente visual para listar ítems del backlog.',
       NOW(), 5, 1, 4, 2, 1, 1, 1,    3,    false, 1,   60, '2026-05-20'),

  -- ── Proyecto 2 (Beta) — Sprints 4-5 ───────────────────────────

  -- HU (id=6) — no parent
  (6,  'Como usuario quiero exportar reportes',
       'Generar reportes de avance del proyecto en PDF.',
       NOW(), 1, 1, 3, 4, 2, 1, 1,    NULL, false, 3,  240, '2026-05-13'),

  -- Tarea (id=7) — parent: HU id=6
  (7,  'Crear endpoint de exportación PDF',
       'Implementar ruta en Express que retorne el PDF generado.',
       NOW(), 2, 2, 2, 5, 2, 1, 1,    6,    false, 3,  300, NULL),

  -- Bug (id=8) — no parent
  (8,  'Fix: gráfica no carga en Safari',
       'El componente de Chart.js no renderiza en Safari 17.',
       NOW(), 3, 4, 1, 4, 2, 1, 1,    NULL, false, 2,  150, NULL),

  -- Subtarea (id=9) — parent: Tarea id=7
  (9,  'Integrar librería de generación de PDF',
       'Evaluar y configurar pdfmake o puppeteer.',
       NOW(), 5, 3, 5, 5, 2, 1, 1,    7,    false, 2,  120, '2026-05-07'),

  -- ── Proyecto 3 (Gamma) — Sprints 6-7 ──────────────────────────

  -- Épica raíz (id=10) — no parent
  (10, 'Épica: Módulo de pagos',
       'Integración completa con pasarela de pagos externa.',
       NOW(), 4, 1, 1, 6, 3, 1, 1,    NULL, false, 5, 1800, NULL),

  -- HU (id=11) — parent: Épica id=10
  (11, 'Como usuario quiero pagar con tarjeta',
       'Implementar flujo de pago con Stripe.',
       NOW(), 1, 2, 2, 6, 3, 1, 1,    10,   false, 4,  480, '2026-05-15'),

  -- Bug (id=12) — no parent
  (12, 'Fix: webhook de pago genera duplicados',
       'El evento payment_intent.succeeded se procesa dos veces.',
       NOW(), 3, 1, 1, 7, 3, 1, 1,    NULL, false, 3,  180, '2026-05-09'),

  -- Tarea (id=13) — parent: HU id=11
  (13, 'Validar tarjetas de crédito en frontend',
       'Integrar Stripe Elements para validación en tiempo real.',
       NOW(), 2, 4, 3, 7, 3, 1, 1,    11,   false, 2,  240, NULL),

  -- ── Proyecto 4 (Delta) — Sprints 8-9 ──────────────────────────

  -- Épica raíz (id=18) — no parent
  (18, 'Épica: App móvil offline-first',
       'Permitir operación sin conexión con sync posterior.',
       NOW(), 4, 2, 2, 8, 4, 1, 1,    NULL, false, 5, 2400, NULL),

  -- HU (id=14) — parent: Épica id=18
  (14, 'Como usuario quiero ver inventario sin red',
       'Cache local de ítems con IndexedDB.',
       NOW(), 1, 2, 4, 8, 4, 1, 1,    18,   false, 4,  360, NULL),

  -- Tarea (id=15) — parent: HU id=14
  (15, 'Crear formulario de registro de inventario',
       'Form nativo con validaciones y persistencia local.',
       NOW(), 2, 2, 3, 8, 4, 1, 1,    14,   false, 3,  420, '2026-05-15'),

  -- Bug (id=16) — no parent
  (16, 'Fix: sync falla al reconectar WiFi',
       'El proceso de reconciliación lanza excepción en Android 14.',
       NOW(), 3, 1, 2, 9, 4, 1, 1,    NULL, false, 3, NULL, '2026-05-10'),

  -- Subtarea (id=17) — parent: Tarea id=15
  (17, 'Diseñar modelo de datos para modo offline',
       'Definir esquema de IndexedDB y estrategia de conflictos.',
       NOW(), 5, 3, 5, 9, 4, 1, 1,    15,   false, 1,   90, '2026-05-25'),

  -- ── Sin responsable ────────────────────────────────────────────

  -- HU (id=19) — no parent
  (19, 'Como usuario quiero ver mi perfil',
       'Mostrar datos personales y avatar del usuario autenticado.',
       NOW(), 1, 1, 4, 1, 1, 1, NULL, NULL, false, 2,  240, NULL),

  -- Tarea (id=20) — parent: HU id=19
  (20, 'Crear estructura de carpetas del proyecto',
       'Definir árbol de directorios siguiendo feature-based arch.',
       NOW(), 2, 1, 3, 2, 1, 1, NULL, 19,   false, 1,   60, NULL),

  -- Subtarea (id=21) — parent: Tarea id=20
  (21, 'Conectar hook useBacklogItems a la vista',
       'Integrar el hook con el componente de lista del backlog.',
       NOW(), 5, 3, 2, 2, 1, 1, NULL, 20,   false, 3,  150, NULL),

  -- Bug (id=22) — no parent
  (22, 'Fix: avatar no carga en Firefox',
       'La imagen SVG del avatar no renderiza correctamente.',
       NOW(), 3, 3, 3, 2, 1, 1, NULL, NULL, false, 2,   90, NULL),

  -- ── Esta semana (2026-05-11..17) — Proyecto 1 Alpha ───────────────

  -- Acabado ✓
  (23, 'Implementar refresh de token automático',
       'Renovar el JWT silenciosamente antes de que expire.',
       NOW(), 2, 4, 2, 1, 1, 1, 1,    NULL, false, 3,  180, '2026-05-12'),

  -- Acabado ✓
  (24, 'Añadir tests unitarios al middleware de auth',
       'Cubrir los casos de token inválido y expirado.',
       NOW(), 2, 4, 3, 2, 1, 1, 1,    NULL, false, 2,  120, '2026-05-13'),

  -- En Revisión
  (25, 'Revisar política de CORS en producción',
       'Verificar orígenes permitidos y cabeceras expuestas.',
       NOW(), 2, 3, 2, 3, 1, 1, 1,    NULL, false, 2,   90, '2026-05-15'),

  -- ── Esta semana — Proyecto 2 Beta ─────────────────────────────────

  -- Acabado ✓
  (26, 'Completar integración con API de reportes',
       'Conectar endpoint /reports al servicio de generación PDF.',
       NOW(), 2, 4, 3, 4, 2, 1, 1,    NULL, false, 3,  200, '2026-05-11'),

  -- En Progreso
  (27, 'Diseñar plantilla HTML para el reporte',
       'Crear la maqueta base que puppeteer convertirá a PDF.',
       NOW(), 2, 2, 2, 5, 2, 1, 1,    NULL, false, 2,  150, '2026-05-14'),

  -- En Revisión
  (28, 'Validar permisos de descarga por rol',
       'Solo managers y admins pueden exportar reportes completos.',
       NOW(), 2, 3, 4, 4, 2, 1, 1,    NULL, false, 2,   60, '2026-05-15'),

  -- ── Esta semana — Proyecto 3 Gamma ────────────────────────────────

  -- Acabado ✓
  (29, 'Crear hook usePagoStatus',
       'Hook que suscribe al estado del pago en tiempo real.',
       NOW(), 2, 4, 2, 6, 3, 1, 1,    NULL, false, 3,  160, '2026-05-12'),

  -- Acabado ✓
  (30, 'Implementar retry automático en webhook',
       'Reintentar hasta 3 veces con backoff exponencial.',
       NOW(), 3, 4, 1, 7, 3, 1, 1,    NULL, false, 3,  210, '2026-05-13'),

  -- En Progreso
  (31, 'Agregar loading state al formulario de pago',
       'Deshabilitar botón y mostrar spinner durante el proceso.',
       NOW(), 5, 2, 3, 6, 3, 1, 1,    NULL, false, 1,   45, '2026-05-14'),

  -- ── Esta semana — Proyecto 4 Delta ────────────────────────────────

  -- Acabado ✓
  (32, 'Escribir lógica de reconciliación de conflictos',
       'Estrategia last-write-wins para conflictos de sync.',
       NOW(), 2, 4, 2, 8, 4, 1, 1,    NULL, false, 4,  300, '2026-05-11'),

  -- En Progreso
  (33, 'Implementar cola de operaciones pendientes',
       'Persistir acciones offline y reproducirlas al reconectar.',
       NOW(), 2, 2, 3, 9, 4, 1, 1,    NULL, false, 4,  360, '2026-05-14'),

  -- En Revisión
  (34, 'Probar sync en red 2G simulada',
       'Validar que la cola no se corrompe con latencia alta.',
       NOW(), 5, 3, 4, 9, 4, 1, 1,    NULL, false, 2,  120, '2026-05-15')

ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('backlog_item', 'id'),
  (SELECT MAX(id) FROM backlog_item)
);

COMMIT;
