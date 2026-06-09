BEGIN;

-- Corrige el flujo de notificaciones para backlog items sugeridos:
-- una sugerencia pendiente no notifica creacion/asignacion ni cambios
-- una sugerencia aceptada si puede notificar creacion al responsable final
-- la creacion queda idempotente por backlog item y usuario destino

CREATE OR REPLACE FUNCTION public.crear_notificacion_creacion_backlog_item(
  p_id_backlog_item bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item record;
  v_id_notificacion integer;
BEGIN
  SELECT bi.id,
         bi.nombre,
         bi.id_proyecto,
         bi.id_usuario_responsable,
         p.nombre AS nombre_proyecto
  INTO v_item
  FROM public.backlog_item bi
  JOIN public.proyecto p ON p.id = bi.id_proyecto
  WHERE bi.id = p_id_backlog_item
  FOR UPDATE OF bi;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backlog item no encontrado: %', p_id_backlog_item
      USING ERRCODE = 'P0002';
  END IF;

  IF v_item.id_usuario_responsable IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.backlog_item_sugerencia_creacion s
    WHERE s.id = v_item.id
      AND s.aceptada IS DISTINCT FROM true
  ) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = v_item.id_usuario_responsable
      AND u.activo = true
  ) THEN
    RETURN NULL;
  END IF;

  SELECT n.id
  INTO v_id_notificacion
  FROM public.notificacion n
  JOIN public.notificacion_backlog_item_creacion d
    ON d.id_notificacion = n.id
  WHERE n.id_usuario = v_item.id_usuario_responsable
    AND d.id_backlog_item = v_item.id
  ORDER BY n.id DESC
  LIMIT 1;

  IF v_id_notificacion IS NOT NULL THEN
    RETURN v_id_notificacion;
  END IF;

  v_id_notificacion := public.crear_notificacion_base(
    v_item.id_usuario_responsable,
    'creacion_backlog_item',
    'Backlog item asignado',
    'Asignado: ' || public.notif_valor_corto(v_item.nombre, 38) || ' en ' || public.notif_valor_corto(v_item.nombre_proyecto, 28) || '.'
  );

  INSERT INTO public.notificacion_backlog_item_creacion (
    id_notificacion,
    id_backlog_item,
    id_proyecto
  )
  VALUES (
    v_id_notificacion,
    v_item.id,
    v_item.id_proyecto
  );

  RETURN v_id_notificacion;
END;
$$;


CREATE OR REPLACE FUNCTION public.crear_sugerencia_creacion_backlog_item(
  p_nombre text,
  p_id_proyecto integer,
  p_id_estatus integer,
  p_id_tipo smallint,
  p_descripcion text DEFAULT NULL,
  p_id_prioridad smallint DEFAULT NULL,
  p_id_sprint integer DEFAULT NULL,
  p_id_usuario_responsable integer DEFAULT NULL,
  p_fecha_inicio timestamp with time zone DEFAULT NULL,
  p_fecha_vencimiento timestamp with time zone DEFAULT NULL,
  p_id_backlog_item_padre bigint DEFAULT NULL,
  p_complejidad smallint DEFAULT NULL,
  p_tiempo_estimado integer DEFAULT NULL
)
RETURNS public.backlog_item
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario integer;
  v_item public.backlog_item;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario;

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.'
      USING ERRCODE = '28000';
  END IF;

  IF NULLIF(btrim(COALESCE(p_nombre, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El nombre del backlog item es obligatorio.'
      USING ERRCODE = '23502';
  END IF;

  IF p_id_proyecto IS NULL OR p_id_estatus IS NULL OR p_id_tipo IS NULL THEN
    RAISE EXCEPTION 'Proyecto, estatus y tipo son obligatorios.'
      USING ERRCODE = '23502';
  END IF;

  IF NOT (
    public.current_global_role() = ANY (ARRAY[1, 2])
    OR public.is_project_member(p_id_proyecto)
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para crear sugerencias en este proyecto.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.backlog_item (
    nombre,
    fecha_creacion,
    descripcion,
    id_tipo,
    id_estatus,
    id_prioridad,
    id_sprint,
    id_usuario_responsable,
    fecha_inicio,
    fecha_vencimiento,
    id_backlog_item_padre,
    id_proyecto,
    id_usuario_creador,
    complejidad,
    tiempo_estimado,
    es_terminal
  )
  VALUES (
    btrim(p_nombre),
    now(),
    NULLIF(p_descripcion, ''),
    p_id_tipo,
    p_id_estatus,
    p_id_prioridad,
    p_id_sprint,
    p_id_usuario_responsable,
    p_fecha_inicio,
    p_fecha_vencimiento,
    p_id_backlog_item_padre,
    p_id_proyecto,
    v_id_usuario,
    p_complejidad,
    p_tiempo_estimado,
    false
  )
  RETURNING * INTO v_item;

  INSERT INTO public.backlog_item_sugerencia_creacion (
    id,
    aceptada,
    id_usuario_acepto
  )
  VALUES (
    v_item.id,
    false,
    NULL
  );

  RETURN v_item;
END;
$$;


CREATE OR REPLACE FUNCTION public.crear_notificaciones_cambio_backlog_item_detallado(
  p_old public.backlog_item,
  p_new public.backlog_item,
  p_id_usuario_actor integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_notificacion integer;
  v_total integer := 0;
  v_recipient record;
  v_descripcion text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.backlog_item_sugerencia_creacion s
    WHERE s.id = p_new.id
      AND s.aceptada IS DISTINCT FROM true
  ) THEN
    RETURN 0;
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT x.id_usuario
    FROM (
      SELECT p_new.id_usuario_responsable AS id_usuario
      WHERE p_new.id_usuario_responsable IS NOT NULL

      UNION

      SELECT p_old.id_usuario_responsable AS id_usuario
      WHERE p_old.id_usuario_responsable IS NOT NULL

      UNION

      SELECT s.id_usuario
      FROM public.suscripcion_notificacion_backlog_item s
      WHERE s.id_backlog_item = p_new.id
    ) x
    JOIN public.usuario u ON u.id = x.id_usuario
    WHERE x.id_usuario IS NOT NULL
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR x.id_usuario IS DISTINCT FROM p_id_usuario_actor)
  LOOP
    v_descripcion := public.construir_descripcion_cambio_backlog_item(
      p_old,
      p_new,
      v_recipient.id_usuario
    );

    IF v_descripcion IS NOT NULL THEN
      v_id_notificacion := public.crear_notificacion_base(
        v_recipient.id_usuario,
        'cambio_backlog_item',
        'Backlog item actualizado',
        v_descripcion
      );

      INSERT INTO public.notificacion_backlog_item_cambio (
        id_notificacion,
        id_backlog_item,
        id_proyecto
      )
      VALUES (
        v_id_notificacion,
        p_new.id,
        p_new.id_proyecto
      );

      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;


CREATE OR REPLACE FUNCTION public.crear_notificaciones_cambio_backlog_item(
  p_id_backlog_item bigint,
  p_id_usuario_actor integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item record;
  v_id_notificacion integer;
  v_total integer := 0;
  v_recipient record;
BEGIN
  SELECT bi.id,
         bi.nombre,
         bi.id_proyecto,
         bi.id_usuario_responsable,
         p.nombre AS nombre_proyecto
  INTO v_item
  FROM public.backlog_item bi
  JOIN public.proyecto p ON p.id = bi.id_proyecto
  WHERE bi.id = p_id_backlog_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backlog item no encontrado: %', p_id_backlog_item
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.backlog_item_sugerencia_creacion s
    WHERE s.id = v_item.id
      AND s.aceptada IS DISTINCT FROM true
  ) THEN
    RETURN 0;
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT x.id_usuario
    FROM (
      SELECT v_item.id_usuario_responsable AS id_usuario
      WHERE v_item.id_usuario_responsable IS NOT NULL

      UNION

      SELECT s.id_usuario
      FROM public.suscripcion_notificacion_backlog_item s
      WHERE s.id_backlog_item = v_item.id
    ) x
    JOIN public.usuario u ON u.id = x.id_usuario
    WHERE x.id_usuario IS NOT NULL
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR x.id_usuario IS DISTINCT FROM p_id_usuario_actor)
  LOOP
    v_id_notificacion := public.crear_notificacion_base(
      v_recipient.id_usuario,
      'cambio_backlog_item',
      'Backlog item actualizado',
      'Actualizado: ' || public.notif_valor_corto(v_item.nombre, 38) || ' en ' || public.notif_valor_corto(v_item.nombre_proyecto, 28) || '.'
    );

    INSERT INTO public.notificacion_backlog_item_cambio (
      id_notificacion,
      id_backlog_item,
      id_proyecto
    )
    VALUES (
      v_id_notificacion,
      v_item.id,
      v_item.id_proyecto
    );

    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END;
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
    AND n.id_tipo_notificacion = 3
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada o ya resuelta.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_id_usuario_notificacion <> v_id_usuario THEN
    RAISE EXCEPTION 'No puedes resolver una notificacion de otro usuario.'
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

  PERFORM public.crear_notificacion_creacion_backlog_item(v_id_backlog_item);
END;
$$;


REVOKE ALL ON FUNCTION public.crear_notificacion_creacion_backlog_item(bigint)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.crear_sugerencia_creacion_backlog_item(
  text,
  integer,
  integer,
  smallint,
  text,
  smallint,
  integer,
  integer,
  timestamp with time zone,
  timestamp with time zone,
  bigint,
  smallint,
  integer
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.crear_sugerencia_creacion_backlog_item(
  text,
  integer,
  integer,
  smallint,
  text,
  smallint,
  integer,
  integer,
  timestamp with time zone,
  timestamp with time zone,
  bigint,
  smallint,
  integer
)
TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crear_notificaciones_cambio_backlog_item(bigint, integer)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.crear_notificaciones_cambio_backlog_item_detallado(public.backlog_item, public.backlog_item, integer)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crear_notificaciones_cambio_backlog_item_detallado(public.backlog_item, public.backlog_item, integer)
TO service_role;

REVOKE ALL ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item(integer)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item(integer)
TO authenticated, service_role;

COMMIT;
