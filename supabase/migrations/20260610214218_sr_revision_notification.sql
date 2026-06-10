-- Migration: Notify PM and Sr. Dev when a backlog item moves to "En revision"
-- so they can review the corresponding GitHub PR.
--
-- Surfaces:
--   1. catalogo_tipo_notificacion         – new type id=10
--   2. notificacion_backlog_item_en_revision – detail table
--   3. crear_notificaciones_item_en_revision() – sender function
--   4. trg_generar_notificaciones_cambio_backlog_item() – trigger updated
--   5. notificacion_feed_view              – view updated

BEGIN;

-- ── 1. Register notification type ────────────────────────────────────────────
UPDATE public.catalogo_tipo_notificacion
SET codigo = left(codigo::text, 35) || '_legacy_' || id::text,
    activo = false
WHERE codigo = 'backlog_item_en_revision'
  AND id <> 10;

INSERT INTO public.catalogo_tipo_notificacion (id, codigo, nombre, descripcion, activo)
VALUES (
  10,
  'backlog_item_en_revision',
  'Backlog item en revisión',
  'Un backlog item fue movido al estado En revisión y requiere revisión de PR en GitHub.',
  true
)
ON CONFLICT (id) DO UPDATE
SET codigo      = EXCLUDED.codigo,
    nombre      = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo      = EXCLUDED.activo;

DO $$
DECLARE
  v_seq text;
BEGIN
  v_seq := pg_get_serial_sequence('public.catalogo_tipo_notificacion', 'id');
  IF v_seq IS NOT NULL THEN
    PERFORM setval(
      v_seq,
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.catalogo_tipo_notificacion), 1),
      true
    );
  END IF;
END;
$$;

-- ── 2. Detail table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificacion_backlog_item_en_revision (
  id_notificacion      integer  NOT NULL PRIMARY KEY,
  id_tipo_notificacion smallint GENERATED ALWAYS AS (10::smallint) STORED,
  id_backlog_item      bigint   NOT NULL,
  id_proyecto          integer  NOT NULL,
  id_usuario_actor     integer,
  CONSTRAINT notificacion_backlog_item_en_revision_tipo_fkey
    FOREIGN KEY (id_notificacion, id_tipo_notificacion)
    REFERENCES public.notificacion(id, id_tipo_notificacion)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_backlog_item_en_revision_backlog_fkey
    FOREIGN KEY (id_backlog_item, id_proyecto)
    REFERENCES public.backlog_item(id, id_proyecto)
    ON DELETE CASCADE,
  CONSTRAINT notificacion_backlog_item_en_revision_actor_fkey
    FOREIGN KEY (id_usuario_actor)
    REFERENCES public.usuario(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notificacion_backlog_item_en_revision_backlog
ON public.notificacion_backlog_item_en_revision (id_backlog_item);

-- ── 3. Sender function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crear_notificaciones_item_en_revision(
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
  v_nombre_estatus_nuevo text;
  v_nombre_proyecto      text;
  v_id_notificacion      integer;
  v_total                integer := 0;
  v_recipient            record;
BEGIN
  IF p_old.id_estatus IS NOT DISTINCT FROM p_new.id_estatus THEN
    RETURN 0;
  END IF;

  SELECT nombre INTO v_nombre_estatus_nuevo
  FROM public.estatus_backlog_item
  WHERE id = p_new.id_estatus;

  IF v_nombre_estatus_nuevo IS DISTINCT FROM 'En Revisión' THEN
    RETURN 0;
  END IF;

  SELECT nombre INTO v_nombre_proyecto
  FROM public.proyecto
  WHERE id = p_new.id_proyecto;

  -- Collect users already notified by crear_notificaciones_cambio_backlog_item_detallado
  -- (responsible user + subscribers) so we don't send them a second notification.
  FOR v_recipient IN
    SELECT DISTINCT epp.id_usuario
    FROM public.etiqueta_proyecto_predeterminada epp
    JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
      ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
    JOIN public.usuario u ON u.id = epp.id_usuario
    WHERE epp.id_proyecto = p_new.id_proyecto
      AND upper(cepp.nombre::text) IN ('PM', 'SR. DEV')
      AND u.activo = true
      AND (p_id_usuario_actor IS NULL OR epp.id_usuario IS DISTINCT FROM p_id_usuario_actor)
      -- Skip users who already receive a cambio_backlog_item notification for this item
      AND epp.id_usuario IS DISTINCT FROM p_new.id_usuario_responsable
      AND epp.id_usuario NOT IN (
        SELECT s.id_usuario
        FROM public.suscripcion_notificacion_backlog_item s
        WHERE s.id_backlog_item = p_new.id
      )
  LOOP
    v_id_notificacion := public.crear_notificacion_base(
      v_recipient.id_usuario,
      'backlog_item_en_revision',
      'Item listo para revisión',
      'En revisión: ' || public.notif_valor_corto(p_new.nombre, 38)
        || ' en ' || public.notif_valor_corto(v_nombre_proyecto, 28) || '.'
    );

    INSERT INTO public.notificacion_backlog_item_en_revision (
      id_notificacion,
      id_backlog_item,
      id_proyecto,
      id_usuario_actor
    )
    VALUES (
      v_id_notificacion,
      p_new.id,
      p_new.id_proyecto,
      p_id_usuario_actor
    );

    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_notificaciones_item_en_revision(public.backlog_item, public.backlog_item, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_notificaciones_item_en_revision(public.backlog_item, public.backlog_item, integer)
TO service_role;

-- ── 4. Update trigger ─────────────────────────────────────────────────────────
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

  PERFORM public.crear_notificaciones_cambio_backlog_item_detallado(OLD, NEW, v_actor);
  PERFORM public.crear_notificaciones_item_en_revision(OLD, NEW, v_actor);

  RETURN NEW;
END;
$$;

-- ── 5. Update notificacion_feed_view ──────────────────────────────────────────
-- DROP + CREATE required because new columns are inserted mid-list;
-- CREATE OR REPLACE only allows appending columns at the end.
DROP VIEW IF EXISTS public.notificacion_feed_view;

CREATE VIEW public.notificacion_feed_view
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
  nbier.id_backlog_item AS id_backlog_item_en_revision,

  COALESCE(
    ip.id_proyecto,
    np.id_proyecto,
    bi_sug.id_proyecto,
    nbic.id_proyecto,
    nbicr.id_proyecto,
    nbiv.id_proyecto,
    nsv.id_proyecto,
    nbicom.id_proyecto,
    nbier.id_proyecto
  ) AS id_proyecto_destino,

  COALESCE(
    p_inv.nombre,
    p_np.nombre,
    p_sug.nombre,
    p_cambio.nombre,
    p_creacion.nombre,
    p_vencimiento.nombre,
    p_sprint.nombre,
    p_comentario.nombre,
    p_en_revision.nombre
  ) AS nombre_proyecto,

  COALESCE(
    nbis.id_backlog_item,
    nbic.id_backlog_item,
    nbicr.id_backlog_item,
    nbiv.id_backlog_item,
    nbicom.id_backlog_item,
    nbier.id_backlog_item
  ) AS id_backlog_item,

  COALESCE(
    bi_sug.nombre,
    bi_cambio.nombre,
    bi_creacion.nombre,
    bi_vencimiento.nombre,
    bi_comentario.nombre,
    bi_en_revision.nombre
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
      'backlog_item_comment_created',
      'backlog_item_en_revision'
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
      'backlog_item_comment_created',
      'backlog_item_en_revision'
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
  ON p_comentario.id = nbicom.id_proyecto

LEFT JOIN public.notificacion_backlog_item_en_revision nbier
  ON nbier.id_notificacion = n.id
LEFT JOIN public.backlog_item bi_en_revision
  ON bi_en_revision.id = nbier.id_backlog_item
LEFT JOIN public.proyecto p_en_revision
  ON p_en_revision.id = nbier.id_proyecto;

REVOKE ALL ON TABLE public.notificacion_feed_view FROM anon, authenticated;
GRANT SELECT ON TABLE public.notificacion_feed_view TO authenticated;
GRANT ALL ON TABLE public.notificacion_feed_view TO service_role;

COMMIT;
