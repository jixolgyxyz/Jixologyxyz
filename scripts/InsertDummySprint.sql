-- ── estatus_sprint (requerido por FK antes de insertar sprints) ───
INSERT INTO estatus_sprint (id, nombre, orden, es_terminal)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Planeado',   1, false),
  (2, 'Activo',     2, false),
  (3, 'Completado', 3, true),
  (4, 'Cancelado',  4, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('estatus_sprint', 'id'),
  (SELECT MAX(id) FROM estatus_sprint)
);


-- ── sprint ────────────────────────────────────────────────────────
INSERT INTO sprint (id, nombre, objetivo, fecha_inicio, fecha_final, id_proyecto, id_usuario_creador, id_estatus)
OVERRIDING SYSTEM VALUE VALUES
  -- Proyecto 1 — Alpha
  (1, 'Sprint 1', 'Configuración inicial y autenticación',   '2025-09-01', '2025-09-14', 1, 1, 3),
  (2, 'Sprint 2', 'Módulo de usuarios y perfiles',           '2025-09-15', '2025-09-28', 1, 1, 3),
  (3, 'Sprint 3', 'Dashboard y reportes base',               '2025-09-29', '2025-10-12', 1, 1, 2),

  -- Proyecto 2 — Beta
  (4, 'Sprint 1', 'Setup del proyecto y conexión a BD',      '2025-11-01', '2025-11-14', 2, 1, 3),
  (5, 'Sprint 2', 'Exportación a PDF y Excel',               '2025-11-15', '2025-11-28', 2, 1, 2),

  -- Proyecto 3 — Gamma
  (6, 'Sprint 1', 'Integración con API de pagos externos',   '2025-12-01', '2025-12-14', 3, 1, 3),
  (7, 'Sprint 2', 'Pruebas de integración y correcciones',   '2025-12-15', '2025-12-28', 3, 1, 1),

  -- Proyecto 4 — Delta
  (8, 'Sprint 1', 'Estructura base de la app móvil',         '2026-03-01', '2026-03-14', 4, 1, 2),
  (9, 'Sprint 2', 'Módulo de inventario en campo',           '2026-03-15', '2026-03-28', 4, 1, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('sprint', 'id'),
  (SELECT MAX(id) FROM sprint)
);
