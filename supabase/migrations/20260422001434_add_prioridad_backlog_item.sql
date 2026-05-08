INSERT INTO prioridad_backlog_item (id, nombre)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Crítica'),
  (2, 'Alta'),
  (3, 'Media'),
  (4, 'Baja'),
  (5, 'Mínima')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('prioridad_backlog_item', 'id'),
  (SELECT MAX(id) FROM prioridad_backlog_item)
);