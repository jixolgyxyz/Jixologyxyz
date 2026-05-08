INSERT INTO estatus_backlog_item (id, nombre, orden, es_terminal)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Por Hacer',   1, false),
  (2, 'En Progreso', 2, false),
  (3, 'En Revisión', 3, false),
  (4, 'Acabado',     4, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('estatus_backlog_item', 'id'),
  (SELECT MAX(id) FROM estatus_backlog_item)
);
