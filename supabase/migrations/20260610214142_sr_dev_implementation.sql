-- Migration: Add 'Sr. Dev' global etiqueta with the same RLS permissions as PM.
--
-- Affected surfaces:
--   1. is_project_pm()                                      – helper used by backlog_item + sugerencia policies
--   2. invitacion_proyecto INSERT                            – can invite members
--   3. etiqueta_proyecto_predeterminada DELETE               – can remove predefined labels from project
--   4. etiqueta_proyecto_personalizada DELETE                – can remove custom labels from project
--   5. usuario_proyecto_fte INSERT                           – can set jornada assignments
--   6. usuario_proyecto_fte UPDATE                          – can update jornada assignments
--   7. usuario_proyecto DELETE                               – can remove members from project
--   8. bitacora_sprint INSERT                               – can create AI sprint reports
--   9. crear_notificaciones_sugerencia_backlog_item()       – receives backlog suggestion notifications
--  10. generar_notificaciones_sprints_proximos_vencer()     – receives sprint deadline notifications

-- ── 1. Catalog entry ──────────────────────────────────────────────────────────
INSERT INTO public.catalogo_etiqueta_proyecto_predeterminada
  (nombre, descripcion, color_bloque, color_letra)
VALUES
  ('Sr. Dev', 'Senior Developer', '#0E7490', '#FFFFFF');

-- ── 2. is_project_pm(): switch from hardcoded id=1 to name-based IN check ────
--    This covers backlog_item and backlog_item_sugerencia_creacion policies,
--    which both delegate to this helper.
CREATE OR REPLACE FUNCTION public.is_project_pm(p_id_proyecto int)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.etiqueta_proyecto_predeterminada epp
    JOIN public.usuario u
      ON u.id = epp.id_usuario
    JOIN public.catalogo_etiqueta_proyecto_predeterminada cat
      ON cat.id = epp.id_etiqueta_proyecto_predeterminada
    WHERE u.auth_id = auth.uid()
      AND epp.id_proyecto = p_id_proyecto
      AND cat.nombre IN ('PM', 'Sr. Dev')
  );
$$;

-- ── 3. invitacion_proyecto INSERT ─────────────────────────────────────────────
DROP POLICY IF EXISTS "invitacion_proyecto_insert_authorized" ON public.invitacion_proyecto;
CREATE POLICY "invitacion_proyecto_insert_authorized"
  ON public.invitacion_proyecto FOR INSERT
  WITH CHECK (
    id_usuario_creador = (SELECT id FROM public.usuario WHERE auth_id = auth.uid())
    AND (
      (SELECT id_rol_global FROM public.usuario WHERE auth_id = auth.uid()) IN (1, 2)
      OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epd
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepd
          ON cepd.id = epd.id_etiqueta_proyecto_predeterminada
        WHERE epd.id_usuario  = (SELECT id FROM public.usuario WHERE auth_id = auth.uid())
          AND epd.id_proyecto = id_proyecto
          AND cepd.nombre IN ('PM', 'Sr. Dev')
      )
    )
  );

-- ── 4. etiqueta_proyecto_predeterminada DELETE ────────────────────────────────
DROP POLICY IF EXISTS "etiqueta_proyecto_delete_pm_or_admin" ON public.etiqueta_proyecto_predeterminada;
CREATE POLICY "etiqueta_proyecto_delete_pm_or_admin"
ON public.etiqueta_proyecto_predeterminada FOR DELETE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada pm_row
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cat
          ON cat.id = pm_row.id_etiqueta_proyecto_predeterminada
        WHERE pm_row.id_usuario  = public.current_usuario_id()
          AND pm_row.id_proyecto = etiqueta_proyecto_predeterminada.id_proyecto
          AND cat.nombre IN ('PM', 'Sr. Dev')
    )
);

-- ── 5. etiqueta_proyecto_personalizada DELETE ─────────────────────────────────
DROP POLICY IF EXISTS "etiqueta_pers_delete_pm_or_admin" ON public.etiqueta_proyecto_personalizada;
CREATE POLICY "etiqueta_pers_delete_pm_or_admin"
ON public.etiqueta_proyecto_personalizada FOR DELETE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.catalogo_etiqueta_proyecto_personalizada cat
        JOIN public.etiqueta_proyecto_predeterminada pm_row
          ON pm_row.id_proyecto = cat.id_proyecto
        JOIN public.catalogo_etiqueta_proyecto_predeterminada pm_cat
          ON pm_cat.id = pm_row.id_etiqueta_proyecto_predeterminada
        WHERE cat.id = etiqueta_proyecto_personalizada.id_etiqueta_proyecto_personalizada
          AND pm_row.id_usuario = public.current_usuario_id()
          AND pm_cat.nombre IN ('PM', 'Sr. Dev')
    )
);

-- ── 6. usuario_proyecto_fte INSERT ────────────────────────────────────────────
DROP POLICY IF EXISTS "usuario_proyecto_fte_insert_pm_or_admin" ON public.usuario_proyecto_fte;
CREATE POLICY "usuario_proyecto_fte_insert_pm_or_admin"
ON public.usuario_proyecto_fte FOR INSERT TO authenticated
WITH CHECK (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre IN ('PM', 'Sr. Dev')
    )
);

-- ── 7. usuario_proyecto_fte UPDATE ────────────────────────────────────────────
DROP POLICY IF EXISTS "usuario_proyecto_fte_update_pm_or_admin" ON public.usuario_proyecto_fte;
CREATE POLICY "usuario_proyecto_fte_update_pm_or_admin"
ON public.usuario_proyecto_fte FOR UPDATE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre IN ('PM', 'Sr. Dev')
    )
)
WITH CHECK (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre IN ('PM', 'Sr. Dev')
    )
);

-- ── 8. usuario_proyecto DELETE ────────────────────────────────────────────────
DROP POLICY IF EXISTS "usuario_proyecto_delete_pm_or_admin" ON public.usuario_proyecto;
CREATE POLICY "usuario_proyecto_delete_pm_or_admin"
ON public.usuario_proyecto FOR DELETE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto.id_proyecto
          AND cepp.nombre IN ('PM', 'Sr. Dev')
    )
);

-- ── 9. bitacora_sprint INSERT ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "pm_or_admin_can_insert_bitacora_sprint" ON public.bitacora_sprint;
CREATE POLICY "pm_or_admin_can_insert_bitacora_sprint"
ON public.bitacora_sprint FOR INSERT
WITH CHECK (
    bitacora_sprint.id_usuario_creador = (
        SELECT id FROM public.usuario WHERE auth_id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM public.usuario u
            WHERE u.auth_id = auth.uid()
              AND u.id_rol_global IN (1, 2)
        )
        OR EXISTS (
            SELECT 1
            FROM public.etiqueta_proyecto_predeterminada epp
            JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
              ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
            JOIN public.sprint s ON s.id = bitacora_sprint.id_sprint
            JOIN public.usuario u ON u.id = epp.id_usuario
            WHERE epp.id_proyecto = s.id_proyecto
              AND cepp.nombre IN ('PM', 'Sr. Dev')
              AND u.auth_id = auth.uid()
        )
    )
);

-- ── 10. crear_notificaciones_sugerencia_backlog_item() ────────────────────────
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
      AND upper(cepp.nombre::text) IN ('PM', 'SR. DEV')
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

-- ── 11. generar_notificaciones_sprints_proximos_vencer() ────────────────────── ──────────────────────
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
        AND upper(cepp.nombre::text) IN ('PM', 'SR. DEV')
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

-- ── 12. usuario_es_pm_proyecto(): include Sr. Dev ─────────────────────────────
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
        AND UPPER(cepp.nombre::text) IN ('PM', 'PROJECT MANAGER', 'SR. DEV')
    )
    OR EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id = p_id_usuario
        AND u.id_rol_global = ANY (ARRAY[1, 2])
    );
$$;

-- ── 13. aceptar_sugerencia_creacion_backlog_item_por_item() ───────────────────
--   Allows PM/Sr. Dev to accept a suggestion directly by backlog item ID,
--   without needing their own notification for it.
CREATE OR REPLACE FUNCTION public.aceptar_sugerencia_creacion_backlog_item_por_item(
  p_id_backlog_item bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario  integer;
  v_id_proyecto integer;
  v_aceptada    boolean;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario;

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.'
      USING ERRCODE = '28000';
  END IF;

  SELECT bi.id_proyecto, s.aceptada
  INTO v_id_proyecto, v_aceptada
  FROM public.backlog_item bi
  JOIN public.backlog_item_sugerencia_creacion s ON s.id = bi.id
  WHERE bi.id = p_id_backlog_item
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.usuario_es_pm_proyecto(v_id_usuario, v_id_proyecto) THEN
    RAISE EXCEPTION 'Solo un PM o Sr. Dev del proyecto puede aceptar esta sugerencia.'
      USING ERRCODE = '42501';
  END IF;

  IF v_aceptada = true THEN
    RAISE EXCEPTION 'La sugerencia ya fue aceptada.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.backlog_item_sugerencia_creacion
  SET aceptada = true,
      id_usuario_acepto = v_id_usuario
  WHERE id = p_id_backlog_item;

  DELETE FROM public.notificacion n
  USING public.notificacion_backlog_item_sugerencia d
  WHERE d.id_notificacion = n.id
    AND d.id_backlog_item = p_id_backlog_item;

  PERFORM public.crear_notificacion_creacion_backlog_item(p_id_backlog_item);
END;
$$;

REVOKE ALL ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item_por_item(bigint)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.aceptar_sugerencia_creacion_backlog_item_por_item(bigint)
TO authenticated, service_role;

-- ── 14. rechazar_sugerencia_creacion_backlog_item_por_item() ──────────────────
CREATE OR REPLACE FUNCTION public.rechazar_sugerencia_creacion_backlog_item_por_item(
  p_id_backlog_item bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id_usuario  integer;
  v_id_proyecto integer;
  v_aceptada    boolean;
BEGIN
  SELECT public.obtener_id_usuario_actual()
  INTO v_id_usuario;

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.'
      USING ERRCODE = '28000';
  END IF;

  SELECT bi.id_proyecto, s.aceptada
  INTO v_id_proyecto, v_aceptada
  FROM public.backlog_item bi
  JOIN public.backlog_item_sugerencia_creacion s ON s.id = bi.id
  WHERE bi.id = p_id_backlog_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.usuario_es_pm_proyecto(v_id_usuario, v_id_proyecto) THEN
    RAISE EXCEPTION 'Solo un PM o Sr. Dev del proyecto puede rechazar esta sugerencia.'
      USING ERRCODE = '42501';
  END IF;

  IF v_aceptada = true THEN
    RAISE EXCEPTION 'No puedes rechazar una sugerencia ya aceptada.'
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.notificacion n
  USING public.notificacion_backlog_item_sugerencia d
  WHERE d.id_notificacion = n.id
    AND d.id_backlog_item = p_id_backlog_item;

  DELETE FROM public.backlog_item_sugerencia_creacion
  WHERE id = p_id_backlog_item;

  DELETE FROM public.backlog_item
  WHERE id = p_id_backlog_item;
END;
$$;

REVOKE ALL ON FUNCTION public.rechazar_sugerencia_creacion_backlog_item_por_item(bigint)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rechazar_sugerencia_creacion_backlog_item_por_item(bigint)
TO authenticated, service_role;
