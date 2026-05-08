-- ── 1. tipo_backlog_item ──────────────────────────────────────────
INSERT INTO tipo_backlog_item (id, nombre)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Historia de Usuario'),
  (2, 'Tarea'),
  (3, 'Bug'),
  (4, 'Épica'),
  (5, 'Subtarea')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('tipo_backlog_item', 'id'),
  (SELECT MAX(id) FROM tipo_backlog_item)
);

