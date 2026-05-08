-- Set jornada for user 1
UPDATE usuario
SET jornada = 40
WHERE id = 1;

-- Insert FTE allocations for user 1
INSERT INTO usuario_proyecto_fte (id_usuario, id_proyecto, cantidad_horas, fte)
VALUES
  (1, 1, 20, null),
  (1, 2, 10, null),
  (1, 3,  5, null),
  (1, 4,  5, null);