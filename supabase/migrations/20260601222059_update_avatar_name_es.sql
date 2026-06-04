-- Rewrite avatar element `nombre_es` into plain Spanish display names.
-- Scope: variant/feature elements only — color (hex) and type elements are left
-- untouched so their swatches stay identifiable.
-- Format: "<Feature> N" with no zero padding (e.g. variant05 -> "Accesorio 5").
-- Descriptive originals keep their descriptor (long01 -> "Cabello largo 1",
-- dark01 -> "Gafas oscuras 1", happy01 -> "Boca feliz 1", etc.).

-- ── Uniform "variantNN" features ──────────────────────────────────────────────
-- One pass for every attribute whose elements are plain variant01, variant02, …
-- The trailing number is taken straight from the source name so it always
-- matches the original variant index (no reliance on row order).
WITH base_names(attr_id, base) AS (
  VALUES
    -- pixelArt
    (1::int,  'Accesorio'),   -- accessories
    (3,       'Barba'),       -- beard
    (4,       'Ropa'),        -- clothing
    (6,       'Ojos'),        -- eyes
    (12,      'Sombrero'),    -- hat
    -- notionist
    (23,      'Barba'),       -- beard
    (24,      'Ropa'),        -- clothing
    (26,      'Cejas'),       -- eyebrows
    (27,      'Ojos'),        -- eyes
    (29,      'Gafas'),       -- glasses
    (30,      'Cabello'),     -- hair (the lone 'hat' element is handled below)
    (31,      'Cabeza'),      -- head
    (32,      'Boca'),        -- mouth
    (33,      'Nariz')        -- nose
)
UPDATE elemento_inventario_avatar e
SET nombre_es = b.base || ' ' || CAST(substring(e.nombre FROM '\d+$') AS int)
FROM base_names b
WHERE e.id_atributo_avatar = b.attr_id
  AND e.nombre ~ '^variant\d+$';

-- ── pixelArt: glasses (dark / light) ──────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Gafas oscuras ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 8 AND nombre LIKE 'dark%';

UPDATE elemento_inventario_avatar
SET nombre_es = 'Gafas claras ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 8 AND nombre LIKE 'light%';

-- ── pixelArt: hair (long / short) ─────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Cabello largo ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 10 AND nombre LIKE 'long%';

UPDATE elemento_inventario_avatar
SET nombre_es = 'Cabello corto ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 10 AND nombre LIKE 'short%';

-- ── pixelArt: mouth (happy / sad) ─────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Boca feliz ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 14 AND nombre LIKE 'happy%';

UPDATE elemento_inventario_avatar
SET nombre_es = 'Boca triste ' || CAST(substring(nombre FROM '\d+$') AS int)
WHERE id_atributo_avatar = 14 AND nombre LIKE 'sad%';

-- ── notionist: clothingGraphic (named) ────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'electric' THEN 'Gráfico eléctrico'
  WHEN 'galaxy'   THEN 'Gráfico galaxia'
  WHEN 'saturn'   THEN 'Gráfico Saturno'
END
WHERE id_atributo_avatar = 25;

-- ── notionist: hair 'hat' element ─────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Cabello con sombrero'
WHERE id_atributo_avatar = 30 AND nombre = 'hat';

-- ── notionist: gesture (named) ────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'hand'              THEN 'Mano'
  WHEN 'handPhone'         THEN 'Mano con teléfono'
  WHEN 'ok'                THEN 'OK'
  WHEN 'okLongArm'         THEN 'OK con brazo largo'
  WHEN 'point'             THEN 'Señalar'
  WHEN 'pointLongArm'      THEN 'Señalar con brazo largo'
  WHEN 'waveLongArm'       THEN 'Saludar con brazo largo'
  WHEN 'waveLongArms'      THEN 'Saludar con brazos largos'
  WHEN 'waveOkLongArms'    THEN 'Saludar y OK con brazos largos'
  WHEN 'wavePointLongArms' THEN 'Saludar y señalar con brazos largos'
END
WHERE id_atributo_avatar = 28;

-- ── miniavs: blush ────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Rubor'
WHERE id_atributo_avatar = 45 AND nombre = 'default';

-- ── miniavs: body ─────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'golf'   THEN 'Cuerpo golf'
  WHEN 'tShirt' THEN 'Cuerpo camiseta'
END
WHERE id_atributo_avatar = 46;

-- ── miniavs: eyes ─────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'confident' THEN 'Ojos confiados'
  WHEN 'happy'     THEN 'Ojos felices'
  WHEN 'normal'    THEN 'Ojos normales'
END
WHERE id_atributo_avatar = 48;

-- ── miniavs: glasses ──────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = 'Gafas normales'
WHERE id_atributo_avatar = 49 AND nombre = 'normal';

-- ── miniavs: hair ─────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'balndess'  THEN 'Calvo'
  WHEN 'classic01' THEN 'Cabello clásico 1'
  WHEN 'classic02' THEN 'Cabello clásico 2'
  WHEN 'curly'     THEN 'Cabello rizado'
  WHEN 'elvis'     THEN 'Cabello Elvis'
  WHEN 'long'      THEN 'Cabello largo'
  WHEN 'ponyTail'  THEN 'Cola de caballo'
  WHEN 'slaughter' THEN 'Cabello estilo slaughter'
  WHEN 'stylish'   THEN 'Cabello estilizado'
END
WHERE id_atributo_avatar = 50;

-- ── miniavs: head ─────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'normal' THEN 'Cabeza normal'
  WHEN 'thin'   THEN 'Cabeza delgada'
  WHEN 'wide'   THEN 'Cabeza ancha'
END
WHERE id_atributo_avatar = 52;

-- ── miniavs: mouth ────────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'default'      THEN 'Boca normal'
  WHEN 'missingTooth' THEN 'Boca con diente faltante'
END
WHERE id_atributo_avatar = 53;

-- ── miniavs: mustache ─────────────────────────────────────────────────────────
UPDATE elemento_inventario_avatar
SET nombre_es = CASE nombre
  WHEN 'freddy'          THEN 'Bigote Freddy'
  WHEN 'horshoe'         THEN 'Bigote herradura'
  WHEN 'pencilThin'      THEN 'Bigote fino'
  WHEN 'pencilThinBeard' THEN 'Bigote fino con barba'
END
WHERE id_atributo_avatar = 54;
