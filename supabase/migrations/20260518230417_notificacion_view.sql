DROP VIEW IF EXISTS public.notificacion_feed_view;

CREATE OR REPLACE VIEW public.notificacion_feed_view
WITH (security_invoker = true)
AS
SELECT
  n.id,
  n.nombre,
  n.descripcion,
  n.leida,
  n.fecha_lectura,
  n.id_usuario,
  n.fecha_envio,
  n.id_tipo_notificacion,
  c.codigo AS tipo_codigo,
  c.nombre AS tipo_nombre,

  nip.id_invitacion_proyecto,
  ip.aceptada AS invitacion_aceptada,

  np.id_proyecto AS id_proyecto_cambio,
  np.id_usuario_actor AS id_usuario_actor_proyecto,

  nbis.id_backlog_item AS id_backlog_item_sugerido,
  bis.aceptada AS sugerencia_aceptada,
  bis.id_usuario_acepto AS id_usuario_acepto_sugerencia,

  nbic.id_backlog_item AS id_backlog_item_cambio,
  nbicr.id_backlog_item AS id_backlog_item_creacion,
  nbiv.id_backlog_item AS id_backlog_item_por_vencer,
  nsv.id_sprint AS id_sprint_por_vencer,

  COALESCE(
    ip.id_proyecto,
    np.id_proyecto,
    bi_sug.id_proyecto,
    nbic.id_proyecto,
    nbicr.id_proyecto,
    nbiv.id_proyecto,
    nsv.id_proyecto
  ) AS id_proyecto_destino,

  COALESCE(
    p_inv.nombre,
    p_np.nombre,
    p_sug.nombre,
    p_cambio.nombre,
    p_creacion.nombre,
    p_vencimiento.nombre,
    p_sprint.nombre
  ) AS nombre_proyecto,

  COALESCE(
    nbis.id_backlog_item,
    nbic.id_backlog_item,
    nbicr.id_backlog_item,
    nbiv.id_backlog_item
  ) AS id_backlog_item,

  COALESCE(
    bi_sug.nombre,
    bi_cambio.nombre,
    bi_creacion.nombre,
    bi_vencimiento.nombre
  ) AS nombre_backlog_item,

  nsv.id_sprint AS id_sprint,
  spr.nombre AS nombre_sprint,

  nbiv.fecha_vencimiento_notificada,
  nsv.fecha_final_notificada,

  CASE
    WHEN c.codigo = 'invitacion_proyecto' THEN 'equipo'
    WHEN c.codigo IN (
      'sugerencia_creacion_backlog_item',
      'cambio_backlog_item',
      'creacion_backlog_item',
      'backlog_item_proximo_vencer'
    ) THEN 'backlog'
    WHEN c.codigo = 'sprint_proximo_vencer' THEN 'sprints'
    WHEN c.codigo = 'cambio_proyecto' THEN COALESCE(csp.codigo, 'general')
    ELSE NULL
  END AS seccion_destino_codigo,

  CASE
    WHEN c.codigo = 'invitacion_proyecto' THEN 'equipo'
    WHEN c.codigo IN (
      'sugerencia_creacion_backlog_item',
      'cambio_backlog_item',
      'creacion_backlog_item',
      'backlog_item_proximo_vencer'
    ) THEN 'backlog'
    WHEN c.codigo = 'sprint_proximo_vencer' THEN 'sprints'
    WHEN c.codigo = 'cambio_proyecto' THEN COALESCE(csp.ruta_relativa, 'general')
    ELSE NULL
  END AS seccion_destino_ruta

FROM public.notificacion n
JOIN public.catalogo_tipo_notificacion c
  ON c.id = n.id_tipo_notificacion

LEFT JOIN public.notificacion_invitacion_proyecto nip
  ON nip.id_notificacion = n.id
LEFT JOIN public.invitacion_proyecto ip
  ON ip.id = nip.id_invitacion_proyecto
LEFT JOIN public.proyecto p_inv
  ON p_inv.id = ip.id_proyecto

LEFT JOIN public.notificacion_proyecto np
  ON np.id_notificacion = n.id
LEFT JOIN public.proyecto p_np
  ON p_np.id = np.id_proyecto
LEFT JOIN public.catalogo_seccion_proyecto_notificacion csp
  ON csp.id = np.id_seccion_proyecto

LEFT JOIN public.notificacion_backlog_item_sugerencia nbis
  ON nbis.id_notificacion = n.id
LEFT JOIN public.backlog_item_sugerencia_creacion bis
  ON bis.id = nbis.id_backlog_item
LEFT JOIN public.backlog_item bi_sug
  ON bi_sug.id = nbis.id_backlog_item
LEFT JOIN public.proyecto p_sug
  ON p_sug.id = bi_sug.id_proyecto

LEFT JOIN public.notificacion_backlog_item_cambio nbic
  ON nbic.id_notificacion = n.id
LEFT JOIN public.backlog_item bi_cambio
  ON bi_cambio.id = nbic.id_backlog_item
LEFT JOIN public.proyecto p_cambio
  ON p_cambio.id = nbic.id_proyecto

LEFT JOIN public.notificacion_backlog_item_creacion nbicr
  ON nbicr.id_notificacion = n.id
LEFT JOIN public.backlog_item bi_creacion
  ON bi_creacion.id = nbicr.id_backlog_item
LEFT JOIN public.proyecto p_creacion
  ON p_creacion.id = nbicr.id_proyecto

LEFT JOIN public.notificacion_backlog_item_vencimiento nbiv
  ON nbiv.id_notificacion = n.id
LEFT JOIN public.backlog_item bi_vencimiento
  ON bi_vencimiento.id = nbiv.id_backlog_item
LEFT JOIN public.proyecto p_vencimiento
  ON p_vencimiento.id = nbiv.id_proyecto

LEFT JOIN public.notificacion_sprint_vencimiento nsv
  ON nsv.id_notificacion = n.id
LEFT JOIN public.sprint spr
  ON spr.id = nsv.id_sprint
LEFT JOIN public.proyecto p_sprint
  ON p_sprint.id = nsv.id_proyecto;

GRANT SELECT ON public.notificacion_feed_view TO authenticated;

BEGIN;

UPDATE public.catalogo_tipo_notificacion
SET codigo = 'sugerencia_creacion_backlog_item',
    nombre = 'Sugerencia de creación de backlog item',
    activo = true
WHERE id = 3
  AND codigo IN ('backlog_item_sugerencia', 'sugerencia_creacion_backlog_item');

UPDATE public.catalogo_tipo_notificacion
SET codigo = 'cambio_proyecto',
    nombre = 'Cambio de proyecto',
    activo = true
WHERE id = 4
  AND codigo IN ('proyecto', 'cambio_proyecto');

INSERT INTO public.catalogo_tipo_notificacion (id, codigo, nombre, descripcion, activo)
VALUES
  (5, 'backlog_item_proximo_vencer', 'Backlog item próximo a vencer', 'Backlog item con fecha de vencimiento próxima.', true),
  (6, 'cambio_backlog_item', 'Cambio de backlog item', 'Cambio relevante en un backlog item.', true),
  (7, 'creacion_backlog_item', 'Creación de backlog item', 'Backlog item creado con responsable asignado.', true),
  (8, 'sprint_proximo_vencer', 'Sprint próximo a finalizar', 'Sprint con fecha final próxima.', true)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

COMMIT;

CREATE OR REPLACE FUNCTION public.usuario_es_pm_proyecto(
  p_id_usuario integer,
  p_id_proyecto integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.etiqueta_proyecto_predeterminada epp
      JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
        ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
      WHERE epp.id_usuario = p_id_usuario
        AND epp.id_proyecto = p_id_proyecto
        AND UPPER(cepp.nombre::text) IN ('PM', 'PROJECT MANAGER')
    )
    OR EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id = p_id_usuario
        AND u.id_rol_global = ANY (ARRAY[1, 2])
    );
$$;

CREATE OR REPLACE FUNCTION public.aceptar_sugerencia_creacion_backlog_item(
  p_id_notificacion integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario integer;
  v_id_usuario_notificacion integer;
  v_id_backlog_item bigint;
  v_id_proyecto integer;
  v_aceptada boolean;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario;

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.'
      USING ERRCODE = '28000';
  END IF;

  SELECT
    n.id_usuario,
    d.id_backlog_item,
    bi.id_proyecto,
    s.aceptada
  INTO
    v_id_usuario_notificacion,
    v_id_backlog_item,
    v_id_proyecto,
    v_aceptada
  FROM public.notificacion n
  JOIN public.notificacion_backlog_item_sugerencia d
    ON d.id_notificacion = n.id
  JOIN public.backlog_item bi
    ON bi.id = d.id_backlog_item
  JOIN public.backlog_item_sugerencia_creacion s
    ON s.id = d.id_backlog_item
  WHERE n.id = p_id_notificacion
    AND n.id_tipo_notificacion = 3;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada o ya resuelta.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_id_usuario_notificacion <> v_id_usuario THEN
    RAISE EXCEPTION 'No puedes resolver una notificación de otro usuario.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.usuario_es_pm_proyecto(v_id_usuario, v_id_proyecto) THEN
    RAISE EXCEPTION 'Solo un PM del proyecto puede aceptar esta sugerencia.'
      USING ERRCODE = '42501';
  END IF;

  IF v_aceptada = true THEN
    RAISE EXCEPTION 'La sugerencia ya fue aceptada.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.backlog_item_sugerencia_creacion
  SET aceptada = true,
      id_usuario_acepto = v_id_usuario
  WHERE id = v_id_backlog_item;

  DELETE FROM public.notificacion n
  USING public.notificacion_backlog_item_sugerencia d
  WHERE d.id_notificacion = n.id
    AND d.id_backlog_item = v_id_backlog_item;
END;
$$;

REVOKE ALL ON FUNCTION public.usuario_es_pm_proyecto(integer, integer)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item(integer)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item(integer)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rechazar_sugerencia_creacion_backlog_item(
  p_id_notificacion integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario integer;
  v_id_usuario_notificacion integer;
  v_id_backlog_item bigint;
  v_id_proyecto integer;
  v_aceptada boolean;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario;

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.'
      USING ERRCODE = '28000';
  END IF;

  SELECT
    n.id_usuario,
    d.id_backlog_item,
    bi.id_proyecto,
    s.aceptada
  INTO
    v_id_usuario_notificacion,
    v_id_backlog_item,
    v_id_proyecto,
    v_aceptada
  FROM public.notificacion n
  JOIN public.notificacion_backlog_item_sugerencia d
    ON d.id_notificacion = n.id
  JOIN public.backlog_item bi
    ON bi.id = d.id_backlog_item
  JOIN public.backlog_item_sugerencia_creacion s
    ON s.id = d.id_backlog_item
  WHERE n.id = p_id_notificacion
    AND n.id_tipo_notificacion = 3;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada o ya resuelta.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_id_usuario_notificacion <> v_id_usuario THEN
    RAISE EXCEPTION 'No puedes resolver una notificación de otro usuario.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.usuario_es_pm_proyecto(v_id_usuario, v_id_proyecto) THEN
    RAISE EXCEPTION 'Solo un PM del proyecto puede rechazar esta sugerencia.'
      USING ERRCODE = '42501';
  END IF;

  IF v_aceptada = true THEN
    RAISE EXCEPTION 'No puedes rechazar una sugerencia ya aceptada.'
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.notificacion n
  USING public.notificacion_backlog_item_sugerencia d
  WHERE d.id_notificacion = n.id
    AND d.id_backlog_item = v_id_backlog_item;

  DELETE FROM public.backlog_item_sugerencia_creacion
  WHERE id = v_id_backlog_item;

  DELETE FROM public.backlog_item
  WHERE id = v_id_backlog_item;
END;
$$;

REVOKE ALL ON FUNCTION public.rechazar_sugerencia_creacion_backlog_item(integer)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rechazar_sugerencia_creacion_backlog_item(integer)
TO authenticated, service_role;
