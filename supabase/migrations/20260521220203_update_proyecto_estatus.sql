-- Estatus de proyecto automático.
--
-- El estatus del proyecto deja de elegirse a mano: se calcula en vivo
-- comparando el % de ítems completados contra el % de tiempo transcurrido
-- (fecha_inicial → fecha_final).
--
-- 1. Nuevo estatus "Adelantado" (id 6) — el proyecto va por delante del plan.
-- 2. fn_estatus_proyecto(...) — aplica las reglas de cálculo.
-- 3. project_card_view expone `estatus_calculado`; la columna `id_estatus`
--    sigue siendo el valor almacenado, usado solo como bandera de archivado
--    (id_estatus = 5).

-- ── 1. Nuevo estatus ───────────────────────────────────────────────────
INSERT INTO estatus_proyecto (id, nombre, orden, es_terminal)
OVERRIDING SYSTEM VALUE VALUES
  (6, 'Adelantado', 6, false)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Función de cálculo ──────────────────────────────────────────────
-- diff = (% ítems completados) − (% tiempo transcurrido)
--   archivado (id_estatus = 5) → Archivado (5)   bandera manual, nunca se pisa
--   sin ítems                  → Sin Asignar (4)
--   todos los ítems hechos     → Completado (1)
--   sin rango de fechas usable → En Progreso (2)
--   diff >= +10                → Adelantado (6)
--   diff <= -10                → Retrasado (3)
--   en otro caso               → En Progreso (2)
CREATE OR REPLACE FUNCTION fn_estatus_proyecto(
  p_id_estatus_actual smallint,
  p_total_items       integer,
  p_done_items        integer,
  p_fecha_inicial     date,
  p_fecha_final       date
) RETURNS smallint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_completion numeric;
  v_time       numeric;
  v_diff       numeric;
BEGIN
  IF p_id_estatus_actual = 5 THEN
    RETURN 5;                                   -- Archivado (manual)
  END IF;

  IF COALESCE(p_total_items, 0) = 0 THEN
    RETURN 4;                                   -- Sin Asignar
  END IF;

  IF p_done_items >= p_total_items THEN
    RETURN 1;                                   -- Completado
  END IF;

  IF p_fecha_inicial IS NULL
     OR p_fecha_final IS NULL
     OR p_fecha_final <= p_fecha_inicial THEN
    RETURN 2;                                   -- En Progreso (sin rango de fechas)
  END IF;

  v_completion := p_done_items::numeric / p_total_items * 100;
  v_time := LEAST(100, GREATEST(0,
    (CURRENT_DATE - p_fecha_inicial)::numeric
    / (p_fecha_final - p_fecha_inicial) * 100));
  v_diff := v_completion - v_time;

  IF v_diff >= 10 THEN
    RETURN 6;                                   -- Adelantado
  ELSIF v_diff <= -10 THEN
    RETURN 3;                                   -- Retrasado
  ELSE
    RETURN 2;                                   -- En Progreso
  END IF;
END;
$$;

-- ── 3. project_card_view con estatus en vivo ───────────────────────────
-- Se conservan las columnas previas en el mismo orden (requisito de
-- CREATE OR REPLACE VIEW) y se agregan `fecha_inicial` y `estatus_calculado`.
CREATE OR REPLACE VIEW project_card_view AS
SELECT
    p.id,
    p.nombre,
    p.id_estatus,
    p.stack_tecnologico,
    p.fecha_final,
    p.descripcion,
    p.fte,
    COUNT(b.id)                                       AS total_backlog_items,
    COUNT(b.id) FILTER (WHERE ebi.es_terminal = true) AS completed_backlog_items,
    ROUND(
      COUNT(b.id) FILTER (WHERE ebi.es_terminal = true) * 100.0
      / NULLIF(COUNT(b.id), 0)
    )                                                 AS completion_percentage,
    p.fecha_inicial,
    fn_estatus_proyecto(
      p.id_estatus,
      COUNT(b.id)::integer,
      COUNT(b.id) FILTER (WHERE ebi.es_terminal = true)::integer,
      p.fecha_inicial,
      p.fecha_final
    )                                                 AS estatus_calculado
FROM proyecto p
LEFT JOIN backlog_item b           ON b.id_proyecto = p.id
LEFT JOIN estatus_backlog_item ebi ON ebi.id = b.id_estatus
GROUP BY p.id, p.nombre, p.id_estatus, p.stack_tecnologico,
         p.fecha_final, p.descripcion, p.fte, p.fecha_inicial;
