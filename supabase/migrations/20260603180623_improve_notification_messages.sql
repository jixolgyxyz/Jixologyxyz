CREATE OR REPLACE FUNCTION public.notif_texto_limite(
  p_text text,
  p_max integer DEFAULT 100
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_text text;
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;

  v_text := btrim(regexp_replace(p_text, '\s+', ' ', 'g'));

  IF p_max IS NULL OR p_max <= 0 THEN
    RETURN '';
  END IF;

  IF char_length(v_text) <= p_max THEN
    RETURN v_text;
  END IF;

  IF p_max = 1 THEN
    RETURN '…';
  END IF;

  RETURN left(v_text, p_max - 1) || '…';
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_valor_corto(
  p_text text,
  p_max integer DEFAULT 24
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_text text;
BEGIN
  v_text := NULLIF(btrim(COALESCE(p_text, '')), '');

  IF v_text IS NULL THEN
    RETURN 'Sin valor';
  END IF;

  RETURN '"' || public.notif_texto_limite(v_text, p_max) || '"';
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_unir_lista(
  p_items text[]
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
BEGIN
  v_count := COALESCE(array_length(p_items, 1), 0);

  IF v_count = 0 THEN
    RETURN '';
  ELSIF v_count = 1 THEN
    RETURN p_items[1];
  ELSIF v_count = 2 THEN
    RETURN p_items[1] || ' y ' || p_items[2];
  END IF;

  RETURN array_to_string(p_items[1:v_count - 1], ', ') || ' y ' || p_items[v_count];
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_zona_horaria_usuario(
  p_id_usuario integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_zona text;
BEGIN
  SELECT zh.nombre
  INTO v_zona
  FROM public.usuario u
  LEFT JOIN public.zona_horaria zh
    ON zh.id = u.id_zona_horaria
  WHERE u.id = p_id_usuario
  LIMIT 1;

  v_zona := COALESCE(NULLIF(btrim(v_zona), ''), 'UTC');

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names tz
    WHERE tz.name = v_zona
  ) THEN
    RETURN 'UTC';
  END IF;

  RETURN v_zona;
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_fmt_timestamptz(
  p_valor timestamp with time zone,
  p_id_usuario integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_zona text;
BEGIN
  IF p_valor IS NULL THEN
    RETURN 'Sin fecha';
  END IF;

  v_zona := public.notif_zona_horaria_usuario(p_id_usuario);

  RETURN to_char(p_valor AT TIME ZONE v_zona, 'YYYY-MM-DD HH24:MI') || ' ' || v_zona;
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_fmt_date(
  p_valor date
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
BEGIN
  IF p_valor IS NULL THEN
    RETURN 'Sin fecha';
  END IF;

  RETURN to_char(p_valor, 'YYYY-MM-DD');
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_usuario(
  p_id_usuario integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_usuario IS NULL THEN
    RETURN 'Sin asignar';
  END IF;

  SELECT COALESCE(
           NULLIF(btrim(concat_ws(' ', NULLIF(btrim(u.nombre), ''), NULLIF(btrim(u.apellido), ''))), ''),
           NULLIF(btrim(u.email), ''),
           'Usuario #' || u.id::text
         )
  INTO v_nombre
  FROM public.usuario u
  WHERE u.id = p_id_usuario
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Usuario #' || p_id_usuario::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_estatus_proyecto(
  p_id_estatus smallint
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_estatus IS NULL THEN
    RETURN 'Sin estatus';
  END IF;

  SELECT ep.nombre
  INTO v_nombre
  FROM public.estatus_proyecto ep
  WHERE ep.id = p_id_estatus
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Estatus #' || p_id_estatus::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_estatus_backlog_item(
  p_id_estatus integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_estatus IS NULL THEN
    RETURN 'Sin estatus';
  END IF;

  SELECT ebi.nombre
  INTO v_nombre
  FROM public.estatus_backlog_item ebi
  WHERE ebi.id = p_id_estatus
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Estatus #' || p_id_estatus::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_prioridad_backlog_item(
  p_id_prioridad smallint
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_prioridad IS NULL THEN
    RETURN 'Sin prioridad';
  END IF;

  SELECT pbi.nombre
  INTO v_nombre
  FROM public.prioridad_backlog_item pbi
  WHERE pbi.id = p_id_prioridad
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Prioridad #' || p_id_prioridad::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_tipo_backlog_item(
  p_id_tipo smallint
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_tipo IS NULL THEN
    RETURN 'Sin tipo';
  END IF;

  SELECT tbi.nombre
  INTO v_nombre
  FROM public.tipo_backlog_item tbi
  WHERE tbi.id = p_id_tipo
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Tipo #' || p_id_tipo::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_nombre_sprint(
  p_id_sprint integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_nombre text;
BEGIN
  IF p_id_sprint IS NULL THEN
    RETURN 'Sin sprint';
  END IF;

  SELECT s.nombre
  INTO v_nombre
  FROM public.sprint s
  WHERE s.id = p_id_sprint
  LIMIT 1;

  RETURN COALESCE(v_nombre, 'Sprint #' || p_id_sprint::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.construir_descripcion_cambio_proyecto(
  p_old public.proyecto,
  p_new public.proyecto,
  p_id_usuario_destino integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_campos text[] := ARRAY[]::text[];
  v_count integer;
  v_campo text;
BEGIN
  IF p_old.nombre IS DISTINCT FROM p_new.nombre THEN
    v_campos := array_append(v_campos, 'nombre');
  END IF;

  IF p_old.descripcion IS DISTINCT FROM p_new.descripcion THEN
    v_campos := array_append(v_campos, 'descripción');
  END IF;

  IF p_old.fecha_inicial IS DISTINCT FROM p_new.fecha_inicial THEN
    v_campos := array_append(v_campos, 'fecha inicial');
  END IF;

  IF p_old.fecha_final IS DISTINCT FROM p_new.fecha_final THEN
    v_campos := array_append(v_campos, 'fecha final');
  END IF;

  IF p_old.id_estatus IS DISTINCT FROM p_new.id_estatus THEN
    v_campos := array_append(v_campos, 'estatus');
  END IF;

  IF p_old.stack_tecnologico IS DISTINCT FROM p_new.stack_tecnologico THEN
    v_campos := array_append(v_campos, 'stack');
  END IF;

  v_count := COALESCE(array_length(v_campos, 1), 0);

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  IF v_count = 1 THEN
    v_campo := v_campos[1];

    IF v_campo = 'nombre' THEN
      RETURN public.notif_texto_limite(
        'Nombre: ' || public.notif_valor_corto(p_old.nombre, 30) || ' → ' || public.notif_valor_corto(p_new.nombre, 30) || '.',
        100
      );
    ELSIF v_campo = 'descripción' THEN
      RETURN public.notif_texto_limite(
        'Descripción: ' || public.notif_valor_corto(p_old.descripcion, 24) || ' → ' || public.notif_valor_corto(p_new.descripcion, 24) || '.',
        100
      );
    ELSIF v_campo = 'fecha inicial' THEN
      RETURN public.notif_texto_limite(
        'Fecha inicial: ' || public.notif_fmt_date(p_old.fecha_inicial) || ' → ' || public.notif_fmt_date(p_new.fecha_inicial) || '.',
        100
      );
    ELSIF v_campo = 'fecha final' THEN
      RETURN public.notif_texto_limite(
        'Fecha final: ' || public.notif_fmt_date(p_old.fecha_final) || ' → ' || public.notif_fmt_date(p_new.fecha_final) || '.',
        100
      );
    ELSIF v_campo = 'estatus' THEN
      RETURN public.notif_texto_limite(
        'Estatus: ' || public.notif_valor_corto(public.notif_nombre_estatus_proyecto(p_old.id_estatus), 28) || ' → ' || public.notif_valor_corto(public.notif_nombre_estatus_proyecto(p_new.id_estatus), 28) || '.',
        100
      );
    ELSIF v_campo = 'stack' THEN
      RETURN public.notif_texto_limite(
        'Stack: ' || public.notif_valor_corto(array_to_string(p_old.stack_tecnologico, ', '), 26) || ' → ' || public.notif_valor_corto(array_to_string(p_new.stack_tecnologico, ', '), 26) || '.',
        100
      );
    END IF;
  END IF;

  IF v_count <= 4 THEN
    RETURN public.notif_texto_limite(
      'Se actualizaron ' || public.notif_unir_lista(v_campos) || '.',
      100
    );
  END IF;

  RETURN public.notif_texto_limite(
    'Se actualizaron ' || public.notif_unir_lista(v_campos[1:3]) || ' y ' || (v_count - 3)::text || ' campos más.',
    100
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.construir_descripcion_cambio_backlog_item(
  p_old public.backlog_item,
  p_new public.backlog_item,
  p_id_usuario_destino integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_campos text[] := ARRAY[]::text[];
  v_count integer;
  v_campo text;
BEGIN
  IF p_old.nombre IS DISTINCT FROM p_new.nombre THEN
    v_campos := array_append(v_campos, 'nombre');
  END IF;

  IF p_old.descripcion IS DISTINCT FROM p_new.descripcion THEN
    v_campos := array_append(v_campos, 'descripción');
  END IF;

  IF p_old.fecha_inicio IS DISTINCT FROM p_new.fecha_inicio THEN
    v_campos := array_append(v_campos, 'inicio');
  END IF;

  IF p_old.fecha_vencimiento IS DISTINCT FROM p_new.fecha_vencimiento THEN
    v_campos := array_append(v_campos, 'vencimiento');
  END IF;

  IF p_old.es_terminal IS DISTINCT FROM p_new.es_terminal THEN
    v_campos := array_append(v_campos, 'terminal');
  END IF;

  IF p_old.id_usuario_responsable IS DISTINCT FROM p_new.id_usuario_responsable THEN
    v_campos := array_append(v_campos, 'responsable');
  END IF;

  IF p_old.id_prioridad IS DISTINCT FROM p_new.id_prioridad THEN
    v_campos := array_append(v_campos, 'prioridad');
  END IF;

  IF p_old.id_tipo IS DISTINCT FROM p_new.id_tipo THEN
    v_campos := array_append(v_campos, 'tipo');
  END IF;

  IF p_old.id_estatus IS DISTINCT FROM p_new.id_estatus THEN
    v_campos := array_append(v_campos, 'estatus');
  END IF;

  IF p_old.id_sprint IS DISTINCT FROM p_new.id_sprint THEN
    v_campos := array_append(v_campos, 'sprint');
  END IF;

  IF p_old.complejidad IS DISTINCT FROM p_new.complejidad THEN
    v_campos := array_append(v_campos, 'complejidad');
  END IF;

  IF p_old.tiempo IS DISTINCT FROM p_new.tiempo THEN
    v_campos := array_append(v_campos, 'tiempo');
  END IF;

  v_count := COALESCE(array_length(v_campos, 1), 0);

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  IF v_count = 1 THEN
    v_campo := v_campos[1];

    IF v_campo = 'nombre' THEN
      RETURN public.notif_texto_limite(
        'Nombre: ' || public.notif_valor_corto(p_old.nombre, 28) || ' → ' || public.notif_valor_corto(p_new.nombre, 28) || '.',
        100
      );
    ELSIF v_campo = 'descripción' THEN
      RETURN public.notif_texto_limite(
        'Descripción: ' || public.notif_valor_corto(p_old.descripcion, 24) || ' → ' || public.notif_valor_corto(p_new.descripcion, 24) || '.',
        100
      );
    ELSIF v_campo = 'inicio' THEN
      RETURN public.notif_texto_limite(
        'Inicio: ' || public.notif_fmt_timestamptz(p_old.fecha_inicio, p_id_usuario_destino) || ' → ' || public.notif_fmt_timestamptz(p_new.fecha_inicio, p_id_usuario_destino) || '.',
        100
      );
    ELSIF v_campo = 'vencimiento' THEN
      RETURN public.notif_texto_limite(
        'Vencimiento: ' || public.notif_fmt_timestamptz(p_old.fecha_vencimiento, p_id_usuario_destino) || ' → ' || public.notif_fmt_timestamptz(p_new.fecha_vencimiento, p_id_usuario_destino) || '.',
        100
      );
    ELSIF v_campo = 'terminal' THEN
      RETURN public.notif_texto_limite(
        'Terminal: ' || CASE WHEN p_old.es_terminal THEN 'Sí' ELSE 'No' END || ' → ' || CASE WHEN p_new.es_terminal THEN 'Sí' ELSE 'No' END || '.',
        100
      );
    ELSIF v_campo = 'responsable' THEN
      RETURN public.notif_texto_limite(
        'Responsable: ' || public.notif_valor_corto(public.notif_nombre_usuario(p_old.id_usuario_responsable), 26) || ' → ' || public.notif_valor_corto(public.notif_nombre_usuario(p_new.id_usuario_responsable), 26) || '.',
        100
      );
    ELSIF v_campo = 'prioridad' THEN
      RETURN public.notif_texto_limite(
        'Prioridad: ' || public.notif_valor_corto(public.notif_nombre_prioridad_backlog_item(p_old.id_prioridad), 26) || ' → ' || public.notif_valor_corto(public.notif_nombre_prioridad_backlog_item(p_new.id_prioridad), 26) || '.',
        100
      );
    ELSIF v_campo = 'tipo' THEN
      RETURN public.notif_texto_limite(
        'Tipo: ' || public.notif_valor_corto(public.notif_nombre_tipo_backlog_item(p_old.id_tipo), 28) || ' → ' || public.notif_valor_corto(public.notif_nombre_tipo_backlog_item(p_new.id_tipo), 28) || '.',
        100
      );
    ELSIF v_campo = 'estatus' THEN
      RETURN public.notif_texto_limite(
        'Estatus: ' || public.notif_valor_corto(public.notif_nombre_estatus_backlog_item(p_old.id_estatus), 26) || ' → ' || public.notif_valor_corto(public.notif_nombre_estatus_backlog_item(p_new.id_estatus), 26) || '.',
        100
      );
    ELSIF v_campo = 'sprint' THEN
      RETURN public.notif_texto_limite(
        'Sprint: ' || public.notif_valor_corto(public.notif_nombre_sprint(p_old.id_sprint), 26) || ' → ' || public.notif_valor_corto(public.notif_nombre_sprint(p_new.id_sprint), 26) || '.',
        100
      );
    ELSIF v_campo = 'complejidad' THEN
      RETURN public.notif_texto_limite(
        'Complejidad: ' || COALESCE(p_old.complejidad::text, 'Sin valor') || ' → ' || COALESCE(p_new.complejidad::text, 'Sin valor') || '.',
        100
      );
    ELSIF v_campo = 'tiempo' THEN
      RETURN public.notif_texto_limite(
        'Tiempo: ' || COALESCE(p_old.tiempo::text || 'h', 'Sin valor') || ' → ' || COALESCE(p_new.tiempo::text || 'h', 'Sin valor') || '.',
        100
      );
    END IF;
  END IF;

  IF v_count <= 4 THEN
    RETURN public.notif_texto_limite(
      'Se actualizaron ' || public.notif_unir_lista(v_campos) || '.',
      100
    );
  END IF;

  RETURN public.notif_texto_limite(
    'Se actualizaron ' || public.notif_unir_lista(v_campos[1:3]) || ' y ' || (v_count - 3)::text || ' campos más.',
    100
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_notificacion_base(
  p_id_usuario integer,
  p_codigo_tipo text,
  p_nombre text,
  p_descripcion text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_tipo smallint;
  v_id_notificacion integer;
BEGIN
  IF p_id_usuario IS NULL THEN
    RAISE EXCEPTION 'El usuario destino de la notificación es obligatorio.'
      USING ERRCODE = '23502';
  END IF;

  SELECT public.obtener_id_tipo_notificacion(p_codigo_tipo)
  INTO v_id_tipo;

  INSERT INTO public.notificacion (
    nombre,
    descripcion,
    id_usuario,
    id_tipo_notificacion
  )
  VALUES (
    public.notif_texto_limite(COALESCE(NULLIF(btrim(p_nombre), ''), 'Notificación'), 50),
    public.notif_texto_limite(p_descripcion, 100),
    p_id_usuario,
    v_id_tipo
  )
  RETURNING id INTO v_id_notificacion;

  RETURN v_id_notificacion;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_notificacion_invitacion_proyecto(
  p_invitacion_id integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_inv record;
  v_id_notificacion integer;
BEGIN
  SELECT ip.id,
         ip.id_usuario_destino,
         ip.id_proyecto,
         ip.aceptada,
         p.nombre AS nombre_proyecto
  INTO v_inv
  FROM public.invitacion_proyecto ip
  JOIN public.proyecto p ON p.id = ip.id_proyecto
  WHERE ip.id = p_invitacion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada: %', p_invitacion_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.aceptada = true THEN
    RETURN NULL;
  END IF;

  SELECT d.id_notificacion
  INTO v_id_notificacion
  FROM public.notificacion_invitacion_proyecto d
  WHERE d.id_invitacion_proyecto = p_invitacion_id;

  IF v_id_notificacion IS NOT NULL THEN
    RETURN v_id_notificacion;
  END IF;

  v_id_notificacion := public.crear_notificacion_base(
    v_inv.id_usuario_destino,
    'invitacion_proyecto',
    'Invitación a proyecto',
    'Invitación al proyecto ' || public.notif_valor_corto(v_inv.nombre_proyecto, 56) || '.'
  );

  INSERT INTO public.notificacion_invitacion_proyecto (
    id_notificacion,
    id_invitacion_proyecto
  )
  VALUES (
    v_id_notificacion,
    p_invitacion_id
  );

  RETURN v_id_notificacion;
END;
$$;

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
  WHERE bi.id = p_id_backlog_item;

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

CREATE OR REPLACE FUNCTION public.crear_notificaciones_sugerencia_backlog_item(
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
         p.nombre AS nombre_proyecto
  INTO v_item
  FROM public.backlog_item bi
  JOIN public.backlog_item_sugerencia_creacion s ON s.id = bi.id
  JOIN public.proyecto p ON p.id = bi.id_proyecto
  WHERE bi.id = p_id_backlog_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia de backlog item no encontrada: %', p_id_backlog_item
      USING ERRCODE = 'P0002';
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT epp.id_usuario
    FROM public.etiqueta_proyecto_predeterminada epp
    JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
      ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
    JOIN public.usuario u ON u.id = epp.id_usuario
    WHERE epp.id_proyecto = v_item.id_proyecto
      AND upper(cepp.nombre::text) = 'PM'
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR epp.id_usuario IS DISTINCT FROM p_id_usuario_actor)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.notificacion n
      JOIN public.notificacion_backlog_item_sugerencia d
        ON d.id_notificacion = n.id
      WHERE n.id_usuario = v_recipient.id_usuario
        AND d.id_backlog_item = v_item.id
    ) THEN
      v_id_notificacion := public.crear_notificacion_base(
        v_recipient.id_usuario,
        'sugerencia_creacion_backlog_item',
        'Nueva sugerencia',
        'Sugerencia: ' || public.notif_valor_corto(v_item.nombre, 38) || ' para ' || public.notif_valor_corto(v_item.nombre_proyecto, 28) || '.'
      );

      INSERT INTO public.notificacion_backlog_item_sugerencia (
        id_notificacion,
        id_backlog_item
      )
      VALUES (
        v_id_notificacion,
        v_item.id
      );

      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_notificaciones_cambio_proyecto_detallado(
  p_old public.proyecto,
  p_new public.proyecto,
  p_id_usuario_actor integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_seccion smallint;
  v_id_notificacion integer;
  v_total integer := 0;
  v_recipient record;
  v_descripcion text;
BEGIN
  SELECT public.obtener_id_seccion_proyecto_notificacion('general')
  INTO v_id_seccion;

  FOR v_recipient IN
    SELECT DISTINCT u.id AS id_usuario
    FROM public.usuario u
    JOIN public.usuario_proyecto up ON up.id_usuario = u.id
    WHERE up.id_proyecto = p_new.id
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR u.id IS DISTINCT FROM p_id_usuario_actor)
  LOOP
    v_descripcion := public.construir_descripcion_cambio_proyecto(
      p_old,
      p_new,
      v_recipient.id_usuario
    );

    IF v_descripcion IS NOT NULL THEN
      v_id_notificacion := public.crear_notificacion_base(
        v_recipient.id_usuario,
        'cambio_proyecto',
        'Proyecto actualizado',
        v_descripcion
      );

      INSERT INTO public.notificacion_proyecto (
        id_notificacion,
        id_proyecto,
        id_seccion_proyecto,
        id_usuario_actor
      )
      VALUES (
        v_id_notificacion,
        p_new.id,
        v_id_seccion,
        p_id_usuario_actor
      );

      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
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

CREATE OR REPLACE FUNCTION public.crear_notificaciones_proyecto(
  p_id_proyecto integer,
  p_codigo_seccion character varying DEFAULT 'general',
  p_nombre character varying DEFAULT 'Proyecto actualizado',
  p_descripcion character varying DEFAULT NULL,
  p_id_usuario_actor integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_proyecto public.proyecto%ROWTYPE;
  v_id_seccion smallint;
  v_id_notificacion integer;
  v_total integer := 0;
  v_recipient record;
BEGIN
  SELECT *
  INTO v_proyecto
  FROM public.proyecto
  WHERE id = p_id_proyecto;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado: %', p_id_proyecto
      USING ERRCODE = 'P0002';
  END IF;

  SELECT public.obtener_id_seccion_proyecto_notificacion(COALESCE(NULLIF(p_codigo_seccion, ''), 'general'))
  INTO v_id_seccion;

  FOR v_recipient IN
    SELECT DISTINCT u.id AS id_usuario
    FROM public.usuario u
    JOIN public.usuario_proyecto up ON up.id_usuario = u.id
    WHERE up.id_proyecto = p_id_proyecto
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR u.id IS DISTINCT FROM p_id_usuario_actor)
  LOOP
    v_id_notificacion := public.crear_notificacion_base(
      v_recipient.id_usuario,
      'cambio_proyecto',
      COALESCE(NULLIF(p_nombre, ''), 'Proyecto actualizado'),
      COALESCE(p_descripcion, 'Proyecto actualizado: ' || public.notif_valor_corto(v_proyecto.nombre, 52) || '.')
    );

    INSERT INTO public.notificacion_proyecto (
      id_notificacion,
      id_proyecto,
      id_seccion_proyecto,
      id_usuario_actor
    )
    VALUES (
      v_id_notificacion,
      p_id_proyecto,
      v_id_seccion,
      p_id_usuario_actor
    );

    v_total := v_total + 1;
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

CREATE OR REPLACE FUNCTION public.generar_notificaciones_backlog_items_proximos_vencer(
  p_horas_anticipacion integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_total integer := 0;
  v_id_notificacion integer;
  v_item record;
  v_recipient record;
BEGIN
  IF p_horas_anticipacion IS NULL OR p_horas_anticipacion <= 0 THEN
    RAISE EXCEPTION 'p_horas_anticipacion debe ser mayor a 0.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN
    SELECT bi.id,
           bi.nombre,
           bi.fecha_vencimiento,
           bi.id_proyecto,
           bi.id_usuario_responsable,
           p.nombre AS nombre_proyecto
    FROM public.backlog_item bi
    JOIN public.proyecto p ON p.id = bi.id_proyecto
    WHERE bi.fecha_vencimiento IS NOT NULL
      AND bi.fecha_vencimiento > now()
      AND bi.fecha_vencimiento <= now() + make_interval(hours => p_horas_anticipacion)
      AND bi.es_terminal = false
  LOOP
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
    LOOP
      INSERT INTO public.notificacion_backlog_item_vencimiento_registro (
        id_usuario,
        id_backlog_item,
        fecha_vencimiento_notificada
      )
      VALUES (
        v_recipient.id_usuario,
        v_item.id,
        v_item.fecha_vencimiento
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_id_notificacion := public.crear_notificacion_base(
          v_recipient.id_usuario,
          'backlog_item_proximo_vencer',
          'Backlog item por vencer',
          'Vence ' || public.notif_fmt_timestamptz(v_item.fecha_vencimiento, v_recipient.id_usuario) || ': ' || public.notif_valor_corto(v_item.nombre, 28) || '.'
        );

        INSERT INTO public.notificacion_backlog_item_vencimiento (
          id_notificacion,
          id_backlog_item,
          id_proyecto,
          fecha_vencimiento_notificada
        )
        VALUES (
          v_id_notificacion,
          v_item.id,
          v_item.id_proyecto,
          v_item.fecha_vencimiento
        );

        UPDATE public.notificacion_backlog_item_vencimiento_registro r
        SET id_notificacion = v_id_notificacion
        WHERE r.id_usuario = v_recipient.id_usuario
          AND r.id_backlog_item = v_item.id
          AND r.fecha_vencimiento_notificada = v_item.fecha_vencimiento;

        v_total := v_total + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.generar_notificaciones_sprints_proximos_vencer(
  p_horas_anticipacion integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_total integer := 0;
  v_id_notificacion integer;
  v_sprint record;
  v_recipient record;
BEGIN
  IF p_horas_anticipacion IS NULL OR p_horas_anticipacion <= 0 THEN
    RAISE EXCEPTION 'p_horas_anticipacion debe ser mayor a 0.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_sprint IN
    SELECT s.id,
           s.nombre,
           s.fecha_final,
           s.id_proyecto,
           p.nombre AS nombre_proyecto
    FROM public.sprint s
    JOIN public.proyecto p ON p.id = s.id_proyecto
    JOIN public.estatus_sprint es ON es.id = s.id_estatus
    WHERE s.fecha_final IS NOT NULL
      AND s.fecha_final > now()
      AND s.fecha_final <= now() + make_interval(hours => p_horas_anticipacion)
      AND es.es_terminal = false
  LOOP
    FOR v_recipient IN
      SELECT DISTINCT epp.id_usuario
      FROM public.etiqueta_proyecto_predeterminada epp
      JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
        ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
      JOIN public.usuario u ON u.id = epp.id_usuario
      WHERE epp.id_proyecto = v_sprint.id_proyecto
        AND upper(cepp.nombre::text) = 'PM'
        AND u.activo = true
    LOOP
      INSERT INTO public.notificacion_sprint_vencimiento_registro (
        id_usuario,
        id_sprint,
        fecha_final_notificada
      )
      VALUES (
        v_recipient.id_usuario,
        v_sprint.id,
        v_sprint.fecha_final
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_id_notificacion := public.crear_notificacion_base(
          v_recipient.id_usuario,
          'sprint_proximo_vencer',
          'Sprint por finalizar',
          'Finaliza ' || public.notif_fmt_timestamptz(v_sprint.fecha_final, v_recipient.id_usuario) || ': ' || public.notif_valor_corto(v_sprint.nombre, 24) || '.'
        );

        INSERT INTO public.notificacion_sprint_vencimiento (
          id_notificacion,
          id_sprint,
          id_proyecto,
          fecha_final_notificada
        )
        VALUES (
          v_id_notificacion,
          v_sprint.id,
          v_sprint.id_proyecto,
          v_sprint.fecha_final
        );

        UPDATE public.notificacion_sprint_vencimiento_registro r
        SET id_notificacion = v_id_notificacion
        WHERE r.id_usuario = v_recipient.id_usuario
          AND r.id_sprint = v_sprint.id
          AND r.fecha_final_notificada = v_sprint.fecha_final;

        v_total := v_total + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generar_notificaciones_cambio_proyecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor integer;
BEGIN
  IF ROW(OLD.nombre, OLD.descripcion, OLD.fecha_inicial, OLD.fecha_final, OLD.id_estatus, OLD.stack_tecnologico)
     IS NOT DISTINCT FROM
     ROW(NEW.nombre, NEW.descripcion, NEW.fecha_inicial, NEW.fecha_final, NEW.id_estatus, NEW.stack_tecnologico) THEN
    RETURN NEW;
  END IF;

  SELECT public.obtener_id_usuario_actual()
  INTO v_actor;

  PERFORM public.crear_notificaciones_cambio_proyecto_detallado(
    OLD,
    NEW,
    v_actor
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generar_notificaciones_cambio_backlog_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor integer;
BEGIN
  IF ROW(OLD.nombre, OLD.descripcion, OLD.fecha_inicio, OLD.fecha_vencimiento, OLD.es_terminal, OLD.id_usuario_responsable, OLD.id_prioridad, OLD.id_tipo, OLD.id_estatus, OLD.id_sprint, OLD.complejidad, OLD.tiempo)
     IS NOT DISTINCT FROM
     ROW(NEW.nombre, NEW.descripcion, NEW.fecha_inicio, NEW.fecha_vencimiento, NEW.es_terminal, NEW.id_usuario_responsable, NEW.id_prioridad, NEW.id_tipo, NEW.id_estatus, NEW.id_sprint, NEW.complejidad, NEW.tiempo) THEN
    RETURN NEW;
  END IF;

  SELECT public.obtener_id_usuario_actual()
  INTO v_actor;

  PERFORM public.crear_notificaciones_cambio_backlog_item_detallado(
    OLD,
    NEW,
    v_actor
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_notificaciones_cambio_proyecto_detallado(public.proyecto, public.proyecto, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_notificaciones_cambio_proyecto_detallado(public.proyecto, public.proyecto, integer) TO service_role;

REVOKE ALL ON FUNCTION public.crear_notificaciones_cambio_backlog_item_detallado(public.backlog_item, public.backlog_item, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_notificaciones_cambio_backlog_item_detallado(public.backlog_item, public.backlog_item, integer) TO service_role;