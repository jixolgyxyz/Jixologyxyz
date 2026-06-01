-- Track which avatar style the user most recently saved so the displayed
-- avatar (UserCard, header, listings, …) reflects their latest choice
-- instead of guessing from row counts.
ALTER TABLE usuario
  ADD COLUMN id_avatar_style_actual INT NOT NULL DEFAULT 1;

ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_avatar_style_actual
  FOREIGN KEY (id_avatar_style_actual) REFERENCES avatar_style(id);

-- Backfill: for users who already have avatars saved, pick the style with
-- the most saved elements as their "current" so they don't suddenly revert
-- to pixelArt on first load after the column is added.
UPDATE usuario u
SET id_avatar_style_actual = sub.id_avatar_style
FROM (
  SELECT id_usuario, id_avatar_style
  FROM (
    SELECT
      id_usuario,
      id_avatar_style,
      COUNT(*)                                                       AS cnt,
      ROW_NUMBER() OVER (PARTITION BY id_usuario ORDER BY COUNT(*) DESC, id_avatar_style) AS rn
    FROM usuario_avatar
    GROUP BY id_usuario, id_avatar_style
  ) ranked
  WHERE rn = 1
) sub
WHERE sub.id_usuario = u.id;
