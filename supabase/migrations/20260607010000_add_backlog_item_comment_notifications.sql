BEGIN;

UPDATE public.catalogo_tipo_notificacion
SET codigo = left(codigo::text, 35) || '_legacy_' || id::text,
    activo = false
WHERE codigo = 'backlog_item_comment_created'
  AND id <> 9;

INSERT INTO public.catalogo_tipo_notificacion (
  id,
  codigo,
  nombre,
  descripcion,
  activo
)
VALUES (
  9,
  'backlog_item_comment_created',
  'Comentario de backlog item',
  'Comentario o respuesta creada en un backlog item.',
  true
)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

DO $$
DECLARE
  v_seq text;
BEGIN
  v_seq := pg_get_serial_sequence('public.catalogo_tipo_notificacion', 'id');
  IF v_seq IS NOT NULL THEN
    PERFORM setval(
      v_seq,
      GREATEST(
        (SELECT COALESCE(MAX(id), 1) FROM public.catalogo_tipo_notificacion),
        1
      ),
      true
    );
  END IF;
END;
$$;

ALTER TABLE public.notificacion
ADD COLUMN IF NOT EXISTS clave_evento character varying(120);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificacion_usuario_clave_evento
ON public.notificacion (id_usuario, clave_evento)
WHERE clave_evento IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notificacion_comentario_entrega (
  id_comentario bigint NOT NULL,
  id_usuario integer NOT NULL,
  id_notificacion integer,
  fecha_registro timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id_comentario, id_usuario),
  CONSTRAINT notificacion_comentario_entrega_comentario_fkey
    FOREIGN KEY (id_comentario)
    REFERENCES public.comentario(id)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_comentario_entrega_usuario_fkey
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuario(id)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_comentario_entrega_notificacion_fkey
    FOREIGN KEY (id_notificacion)
    REFERENCES public.notificacion(id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificacion_comentario_entrega_notificacion
ON public.notificacion_comentario_entrega (id_notificacion)
WHERE id_notificacion IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notificacion_backlog_item_comentario (
  id_notificacion integer NOT NULL PRIMARY KEY,
  id_tipo_notificacion smallint GENERATED ALWAYS AS (9::smallint) STORED,
  id_comentario bigint NOT NULL,
  id_comentario_padre bigint,
  id_backlog_item bigint NOT NULL,
  id_proyecto integer NOT NULL,
  id_usuario_actor integer,
  es_respuesta boolean NOT NULL,
  CONSTRAINT notificacion_backlog_item_comentario_tipo_fkey
    FOREIGN KEY (id_notificacion, id_tipo_notificacion)
    REFERENCES public.notificacion(id, id_tipo_notificacion)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_backlog_item_comentario_comentario_fkey
    FOREIGN KEY (id_comentario)
    REFERENCES public.comentario(id)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_backlog_item_comentario_padre_fkey
    FOREIGN KEY (id_comentario_padre)
    REFERENCES public.comentario(id)
    ON DELETE SET NULL,
  CONSTRAINT notificacion_backlog_item_comentario_backlog_fkey
    FOREIGN KEY (id_backlog_item, id_proyecto)
    REFERENCES public.backlog_item(id, id_proyecto)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_backlog_item_comentario_actor_fkey
    FOREIGN KEY (id_usuario_actor)
    REFERENCES public.usuario(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notificacion_backlog_item_comentario_comentario
ON public.notificacion_backlog_item_comentario (id_comentario);

CREATE INDEX IF NOT EXISTS idx_notificacion_backlog_item_comentario_backlog
ON public.notificacion_backlog_item_comentario (id_backlog_item);

CREATE INDEX IF NOT EXISTS idx_comentario_backlog_item_id
ON public.comentario (id_backlog_item, id);

CREATE INDEX IF NOT EXISTS idx_comentario_padre
ON public.comentario (id_comentario_padre)
WHERE id_comentario_padre IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validar_relacion_comentario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario_actual integer;
  v_id_backlog_padre bigint;
  v_crea_ciclo boolean;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario_actual;

  IF v_id_usuario_actual IS NOT NULL
     AND NEW.id_usuario_creador IS DISTINCT FROM v_id_usuario_actual THEN
    RAISE EXCEPTION 'El autor del comentario no coincide con la sesion autenticada.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id_comentario_padre IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.id_backlog_item
  INTO v_id_backlog_padre
  FROM public.comentario c
  WHERE c.id = NEW.id_comentario_padre;

  IF v_id_backlog_padre IS NULL THEN
    RAISE EXCEPTION 'Comentario padre no encontrado: %', NEW.id_comentario_padre
      USING ERRCODE = '23503';
  END IF;

  IF v_id_backlog_padre IS DISTINCT FROM NEW.id_backlog_item THEN
    RAISE EXCEPTION 'El comentario padre pertenece a otro backlog item.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.id IS NOT NULL AND NEW.id_comentario_padre = NEW.id THEN
    RAISE EXCEPTION 'Un comentario no puede ser su propio padre.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.id IS NOT NULL THEN
    WITH RECURSIVE ancestros AS (
      SELECT
        c.id,
        c.id_comentario_padre,
        ARRAY[c.id]::bigint[] AS ruta,
        1 AS profundidad
      FROM public.comentario c
      WHERE c.id = NEW.id_comentario_padre

      UNION ALL

      SELECT
        padre.id,
        padre.id_comentario_padre,
        ancestros.ruta || padre.id,
        ancestros.profundidad + 1
      FROM ancestros
      JOIN public.comentario padre
        ON padre.id = ancestros.id_comentario_padre
      WHERE ancestros.profundidad < 100
        AND NOT padre.id = ANY (ancestros.ruta)
    )
    SELECT EXISTS (
      SELECT 1
      FROM ancestros
      WHERE id = NEW.id
    )
    INTO v_crea_ciclo;

    IF v_crea_ciclo THEN
      RAISE EXCEPTION 'La relacion de comentarios produciria un ciclo.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_relacion_comentario
ON public.comentario;

CREATE TRIGGER trg_validar_relacion_comentario
BEFORE INSERT OR UPDATE OF id_comentario_padre, id_backlog_item, id_usuario_creador
ON public.comentario
FOR EACH ROW
EXECUTE FUNCTION public.validar_relacion_comentario();

ALTER TABLE public.comentario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comentario_select_project_member
ON public.comentario;

CREATE POLICY comentario_select_project_member
ON public.comentario
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.backlog_item bi
    WHERE bi.id = comentario.id_backlog_item
      AND (
        public.is_project_member(bi.id_proyecto)
        OR EXISTS (
          SELECT 1
          FROM public.usuario u
          WHERE u.auth_id = auth.uid()
            AND u.id_rol_global IN (1, 2)
            AND u.activo = true
        )
      )
  )
);

DROP POLICY IF EXISTS comentario_insert_project_member_own
ON public.comentario;

CREATE POLICY comentario_insert_project_member_own
ON public.comentario
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario_creador = public.current_usuario_id()
  AND EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = comentario.id_usuario_creador
      AND u.auth_id = auth.uid()
      AND u.activo = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.backlog_item bi
    WHERE bi.id = comentario.id_backlog_item
      AND (
        public.current_global_role() IN (1, 2)
        OR public.is_project_member(bi.id_proyecto)
      )
  )
);

DROP POLICY IF EXISTS comentario_delete_project_member_own
ON public.comentario;

CREATE POLICY comentario_delete_project_member_own
ON public.comentario
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.auth_id = auth.uid()
      AND u.id_rol_global IN (1, 2)
      AND u.activo = true
  )
  OR (
    id_usuario_creador = public.current_usuario_id()
    AND EXISTS (
      SELECT 1
      FROM public.backlog_item bi
      WHERE bi.id = comentario.id_backlog_item
        AND public.is_project_member(bi.id_proyecto)
    )
  )
);

REVOKE ALL ON TABLE public.comentario FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.comentario TO authenticated;
GRANT ALL ON TABLE public.comentario TO service_role;

DO $$
DECLARE
  v_seq text;
BEGIN
  v_seq := pg_get_serial_sequence('public.comentario', 'id');
  IF v_seq IS NOT NULL THEN
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated, service_role',
      v_seq
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_notificaciones_comentario_backlog_item(
  p_id_comentario bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_comentario record;
  v_actor_nombre text;
  v_clave_evento text;
  v_nombre text;
  v_descripcion text;
  v_destinatarios integer[];
  v_total integer := 0;
BEGIN
  SELECT
    c.id,
    c.id_usuario_creador,
    c.id_comentario_padre,
    c.id_backlog_item,
    bi.id_proyecto,
    bi.id_usuario_responsable,
    bi.nombre AS nombre_backlog_item,
    p.nombre AS nombre_proyecto
  INTO v_comentario
  FROM public.comentario c
  JOIN public.backlog_item bi
    ON bi.id = c.id_backlog_item
  JOIN public.proyecto p
    ON p.id = bi.id_proyecto
  WHERE c.id = p_id_comentario;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentario no encontrado: %', p_id_comentario
      USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(public.current_global_role(), 0) NOT IN (1, 2)
     AND NOT EXISTS (
       SELECT 1
       FROM public.usuario u
       JOIN public.usuario_proyecto up
         ON up.id_usuario = u.id
        AND up.id_proyecto = v_comentario.id_proyecto
       WHERE u.id = v_comentario.id_usuario_creador
         AND u.activo = true
     ) THEN
    RAISE EXCEPTION 'El autor no tiene acceso vigente al proyecto del backlog item.'
      USING ERRCODE = '42501';
  END IF;

  v_actor_nombre := public.notif_nombre_usuario(
    v_comentario.id_usuario_creador
  );
  v_clave_evento :=
    'backlog_item_comment_created:' || v_comentario.id::text;
  v_nombre := CASE
    WHEN v_comentario.id_comentario_padre IS NULL
      THEN 'Nuevo comentario'
    ELSE 'Nueva respuesta'
  END;
  v_descripcion := public.notif_texto_limite(
    v_actor_nombre
      || CASE
           WHEN v_comentario.id_comentario_padre IS NULL
             THEN ' comentó en '
           ELSE ' respondió en '
         END
      || public.notif_valor_corto(v_comentario.nombre_backlog_item, 32)
      || ' "'
      || public.notif_texto_limite(v_comentario.nombre_proyecto, 24)
      || '".',
    100
  );

  WITH RECURSIVE ancestros AS (
    SELECT
      c.id,
      c.id_usuario_creador,
      c.id_comentario_padre,
      ARRAY[c.id]::bigint[] AS ruta,
      1 AS profundidad
    FROM public.comentario c
    WHERE v_comentario.id_comentario_padre IS NOT NULL
      AND c.id = v_comentario.id_comentario_padre
      AND c.id_backlog_item = v_comentario.id_backlog_item

    UNION ALL

    SELECT
      padre.id,
      padre.id_usuario_creador,
      padre.id_comentario_padre,
      ancestros.ruta || padre.id,
      ancestros.profundidad + 1
    FROM ancestros
    JOIN public.comentario padre
      ON padre.id = ancestros.id_comentario_padre
     AND padre.id_backlog_item = v_comentario.id_backlog_item
    WHERE ancestros.profundidad < 100
      AND NOT padre.id = ANY (ancestros.ruta)
  ),
  candidatos AS (
    SELECT s.id_usuario
    FROM public.suscripcion_notificacion_backlog_item s
    WHERE s.id_backlog_item = v_comentario.id_backlog_item

    UNION

    SELECT v_comentario.id_usuario_responsable
    WHERE v_comentario.id_usuario_responsable IS NOT NULL

    UNION

    SELECT epp.id_usuario
    FROM public.etiqueta_proyecto_predeterminada epp
    WHERE epp.id_proyecto = v_comentario.id_proyecto
      AND epp.id_etiqueta_proyecto_predeterminada = 1

    UNION

    SELECT a.id_usuario_creador
    FROM ancestros a
  ),
  destinatarios AS (
    SELECT DISTINCT candidatos.id_usuario
    FROM candidatos
    JOIN public.usuario u
      ON u.id = candidatos.id_usuario
     AND u.activo = true
    JOIN public.usuario_proyecto up
      ON up.id_usuario = candidatos.id_usuario
     AND up.id_proyecto = v_comentario.id_proyecto
    WHERE candidatos.id_usuario IS NOT NULL
      AND candidatos.id_usuario IS DISTINCT
          FROM v_comentario.id_usuario_creador
  ),
  reservados AS (
    INSERT INTO public.notificacion_comentario_entrega (
      id_comentario,
      id_usuario
    )
    SELECT
      v_comentario.id,
      destinatarios.id_usuario
    FROM destinatarios
    ON CONFLICT (id_comentario, id_usuario) DO NOTHING
    RETURNING id_usuario
  )
  SELECT array_agg(reservados.id_usuario ORDER BY reservados.id_usuario)
  INTO v_destinatarios
  FROM reservados;

  IF COALESCE(array_length(v_destinatarios, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notificacion (
    nombre,
    descripcion,
    id_usuario,
    id_tipo_notificacion,
    clave_evento
  )
  SELECT
    v_nombre,
    v_descripcion,
    destinatario.id_usuario,
    9,
    v_clave_evento
  FROM unnest(v_destinatarios) AS destinatario(id_usuario)
  ON CONFLICT (id_usuario, clave_evento)
    WHERE clave_evento IS NOT NULL
  DO NOTHING;

  UPDATE public.notificacion_comentario_entrega entrega
  SET id_notificacion = n.id
  FROM public.notificacion n
  WHERE entrega.id_comentario = v_comentario.id
    AND entrega.id_usuario = ANY (v_destinatarios)
    AND n.id_usuario = entrega.id_usuario
    AND n.clave_evento = v_clave_evento
    AND n.id_tipo_notificacion = 9;

  INSERT INTO public.notificacion_backlog_item_comentario (
    id_notificacion,
    id_comentario,
    id_comentario_padre,
    id_backlog_item,
    id_proyecto,
    id_usuario_actor,
    es_respuesta
  )
  SELECT
    entrega.id_notificacion,
    v_comentario.id,
    v_comentario.id_comentario_padre,
    v_comentario.id_backlog_item,
    v_comentario.id_proyecto,
    v_comentario.id_usuario_creador,
    v_comentario.id_comentario_padre IS NOT NULL
  FROM public.notificacion_comentario_entrega entrega
  WHERE entrega.id_comentario = v_comentario.id
    AND entrega.id_usuario = ANY (v_destinatarios)
    AND entrega.id_notificacion IS NOT NULL
  ON CONFLICT (id_notificacion) DO NOTHING;

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generar_notificaciones_comentario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM public.crear_notificaciones_comentario_backlog_item(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_notificaciones_comentario
ON public.comentario;

CREATE TRIGGER trg_generar_notificaciones_comentario
AFTER INSERT ON public.comentario
FOR EACH ROW
EXECUTE FUNCTION public.trg_generar_notificaciones_comentario();

DROP TRIGGER IF EXISTS trg_detalle_comentario_borrado_eliminar_notificacion
ON public.notificacion_backlog_item_comentario;

CREATE TRIGGER trg_detalle_comentario_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_backlog_item_comentario
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();

ALTER TABLE public.notificacion_backlog_item_comentario
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacion_backlog_item_comentario_select_own
ON public.notificacion_backlog_item_comentario;

CREATE POLICY notificacion_backlog_item_comentario_select_own
ON public.notificacion_backlog_item_comentario
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.notificacion n
    JOIN public.usuario u
      ON u.id = n.id_usuario
    WHERE n.id = notificacion_backlog_item_comentario.id_notificacion
      AND u.auth_id = auth.uid()
  )
);

ALTER TABLE public.notificacion_comentario_entrega
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notificacion_backlog_item_comentario
FROM anon, authenticated;
REVOKE ALL ON TABLE public.notificacion_comentario_entrega
FROM anon, authenticated;

GRANT SELECT ON TABLE public.notificacion_backlog_item_comentario
TO authenticated;
GRANT ALL ON TABLE public.notificacion_backlog_item_comentario
TO service_role;
GRANT ALL ON TABLE public.notificacion_comentario_entrega
TO service_role;

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
    nsv.id_proyecto,
    nbicom.id_proyecto
  ) AS id_proyecto_destino,

  COALESCE(
    p_inv.nombre,
    p_np.nombre,
    p_sug.nombre,
    p_cambio.nombre,
    p_creacion.nombre,
    p_vencimiento.nombre,
    p_sprint.nombre,
    p_comentario.nombre
  ) AS nombre_proyecto,

  COALESCE(
    nbis.id_backlog_item,
    nbic.id_backlog_item,
    nbicr.id_backlog_item,
    nbiv.id_backlog_item,
    nbicom.id_backlog_item
  ) AS id_backlog_item,

  COALESCE(
    bi_sug.nombre,
    bi_cambio.nombre,
    bi_creacion.nombre,
    bi_vencimiento.nombre,
    bi_comentario.nombre
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
      'backlog_item_proximo_vencer',
      'backlog_item_comment_created'
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
      'backlog_item_proximo_vencer',
      'backlog_item_comment_created'
    ) THEN 'backlog'
    WHEN c.codigo = 'sprint_proximo_vencer' THEN 'sprints'
    WHEN c.codigo = 'cambio_proyecto' THEN COALESCE(csp.ruta_relativa, 'general')
    ELSE NULL
  END AS seccion_destino_ruta,

  nbicom.id_comentario,
  nbicom.id_comentario_padre,
  nbicom.id_usuario_actor AS id_usuario_actor_comentario,
  nbicom.es_respuesta AS es_respuesta_comentario

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
  ON p_sprint.id = nsv.id_proyecto

LEFT JOIN public.notificacion_backlog_item_comentario nbicom
  ON nbicom.id_notificacion = n.id
LEFT JOIN public.backlog_item bi_comentario
  ON bi_comentario.id = nbicom.id_backlog_item
LEFT JOIN public.proyecto p_comentario
  ON p_comentario.id = nbicom.id_proyecto;

REVOKE ALL ON TABLE public.notificacion_feed_view
FROM anon, authenticated;
GRANT SELECT ON TABLE public.notificacion_feed_view
TO authenticated;
GRANT ALL ON TABLE public.notificacion_feed_view
TO service_role;

REVOKE ALL ON FUNCTION public.validar_relacion_comentario()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crear_notificaciones_comentario_backlog_item(bigint)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_generar_notificaciones_comentario()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.crear_notificaciones_comentario_backlog_item(bigint)
TO service_role;

COMMIT;
