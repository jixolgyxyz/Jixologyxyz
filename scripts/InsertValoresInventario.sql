-- Seed starting inventory: roughly half the elements from every attribute
-- across every avatar style (pixelArt, notionist, miniavs, …).
-- Using ROW_NUMBER() partitioned by attribute guarantees a balanced share
-- per slot (e.g. half the hair variants, half the eye variants, etc.)
-- regardless of how many total elements each style has.
WITH ranked_elements AS (
  SELECT
    e.id,
    ROW_NUMBER() OVER (PARTITION BY e.id_atributo_avatar ORDER BY e.id) AS rn
  FROM public.elemento_inventario_avatar e
)
INSERT INTO public.usuario_inventario_avatar (id_usuario, id_elemento, fecha_obtencion)
SELECT u.id, r.id, NOW()
FROM public.usuario u
CROSS JOIN ranked_elements r
WHERE u.email = 'juan.guarnizo@gmail.com'
  AND r.rn % 2 = 1
ON CONFLICT (id_usuario, id_elemento) DO NOTHING;
