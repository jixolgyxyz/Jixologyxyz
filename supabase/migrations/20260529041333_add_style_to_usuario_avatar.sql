-- Add id_avatar_style to usuario_avatar so each style's avatar is saved independently
ALTER TABLE usuario_avatar
  ADD COLUMN id_avatar_style INT NOT NULL DEFAULT 1;

-- Backfill existing rows with the correct style derived from the element's attribute
UPDATE usuario_avatar ua
SET id_avatar_style = a.id_avatar_style
FROM elemento_inventario_avatar e
JOIN atributo_avatar a ON e.id_atributo_avatar = a.id
WHERE ua.id_elemento = e.id;

ALTER TABLE usuario_avatar
  ADD CONSTRAINT fk_usuario_avatar_style
  FOREIGN KEY (id_avatar_style) REFERENCES avatar_style(id) DEFERRABLE INITIALLY IMMEDIATE;
