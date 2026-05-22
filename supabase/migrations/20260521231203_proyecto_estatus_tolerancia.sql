-- Estatus de proyecto: padding configurable por proyecto.
--
-- Antes el margen "En Progreso" era fijo (±10). Ahora fn_estatus_proyecto usa
-- la tolerancia de desviación del propio proyecto (proyecto.tolerancia_desviacion)
-- como el padding ± alrededor del cual el avance se considera en tiempo.
-- Si el proyecto no tiene tolerancia definida, se usa 10% por defecto.
--
--   diff = (% ítems completados) − (% tiempo transcurrido)
--     |diff| <  tolerancia → En Progreso (2)
--     diff  >=  tolerancia → Adelantado  (6)
--     diff  <= -tolerancia → Retrasado   (3)
--
-- project_card_view depende de la función, así que se recrean ambos.

DROP VIEW IF EXISTS project_card_view;
DROP FUNCTION IF EXISTS fn_estatus_proyecto(smallint, integer, integer, date, date);

CREATE OR REPLACE FUNCTION fn_estatus_proyecto(
  p_id_estatus_actual smallint,
  p_total_items       integer,
  p_done_items        integer,
  p_fecha_inicial     date,
  p_fecha_final       date,
  p_tolerancia        numeric
) RETURNS smallint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_completion numeric;
  v_time       numeric;
  v_diff       numeric;
  v_padding    numeric;
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

  -- Padding ±: tolerancia del proyecto, o 10% si no está definida.
  v_padding := COALESCE(p_tolerancia, 10);

  IF v_diff >= v_padding THEN
    RETURN 6;                                   -- Adelantado
  ELSIF v_diff <= -v_padding THEN
    RETURN 3;                                   -- Retrasado
  ELSE
    RETURN 2;                                   -- En Progreso
  END IF;
END;
$$;

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
      p.fecha_final,
      p.tolerancia_desviacion
    )                                                 AS estatus_calculado
FROM proyecto p
LEFT JOIN backlog_item b           ON b.id_proyecto = p.id
LEFT JOIN estatus_backlog_item ebi ON ebi.id = b.id_estatus
GROUP BY p.id, p.nombre, p.id_estatus, p.stack_tecnologico,
         p.fecha_final, p.descripcion, p.fte, p.fecha_inicial,
         p.tolerancia_desviacion;
