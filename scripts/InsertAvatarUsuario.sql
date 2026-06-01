-- Seed a complete saved avatar for user id=1 in every avatar style.
-- For each non-probability attribute (variants, colors, types), picks the
-- first element by id and inserts it into usuario_avatar, tagged with the
-- attribute's id_avatar_style so per-style loading works correctly.
INSERT INTO public.usuario_avatar (id_usuario, id_elemento, id_avatar_style)
SELECT
  1                       AS id_usuario,
  first_elem.id           AS id_elemento,
  a.id_avatar_style       AS id_avatar_style
FROM public.atributo_avatar a
CROSS JOIN LATERAL (
  SELECT e.id
  FROM public.elemento_inventario_avatar e
  WHERE e.id_atributo_avatar = a.id
  ORDER BY e.id
  LIMIT 1
) AS first_elem
WHERE a.nombre NOT LIKE '%Probability'
ON CONFLICT (id_usuario, id_elemento) DO NOTHING;
