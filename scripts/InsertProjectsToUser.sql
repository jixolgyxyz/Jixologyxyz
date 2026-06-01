-- User 1 — member of all 4 projects
INSERT INTO usuario_proyecto (id_usuario, id_proyecto) VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4)
ON CONFLICT (id_usuario, id_proyecto) DO NOTHING;

-- User 1 — PM in every project.
-- etiqueta_proyecto_predeterminada id 1 = 'PM' (catalogo_etiqueta_proyecto_predeterminada).
-- id_asignador = 1 → self-assigned by the initial admin.
INSERT INTO etiqueta_proyecto_predeterminada
  (id_usuario, id_etiqueta_proyecto_predeterminada, id_proyecto, fecha_asignacion, id_asignador)
VALUES
  (1, 1, 1, NOW(), 1),
  (1, 1, 2, NOW(), 1),
  (1, 1, 3, NOW(), 1),
  (1, 1, 4, NOW(), 1)
ON CONFLICT (id_usuario, id_etiqueta_proyecto_predeterminada, id_proyecto) DO NOTHING;
