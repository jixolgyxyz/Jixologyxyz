BEGIN;

-- =========================================================
-- Columna base para fecha de envío
-- =========================================================

ALTER TABLE public.notificacion
ADD COLUMN IF NOT EXISTS fecha_envio TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.notificacion
ALTER COLUMN leida SET DEFAULT false;

-- =========================================================
-- RLS para consultar y borrar solo notificaciones propias
-- =========================================================

ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_select_authenticated
ON public.notificacion;

CREATE POLICY notification_select_authenticated
ON public.notificacion
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = notificacion.id_usuario
      AND u.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS notification_delete_authenticated
ON public.notificacion;

CREATE POLICY notification_delete_authenticated
ON public.notificacion
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = notificacion.id_usuario
      AND u.auth_id = auth.uid()
  )
);

GRANT SELECT, DELETE ON public.notificacion TO authenticated;

-- =========================================================
-- RPC para obtener usuario interno y zona horaria
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_notification_user_context()
RETURNS TABLE (
  id_usuario INT,
  auth_id uuid,
  time_zone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    u.id AS id_usuario,
    u.auth_id,
    COALESCE(zh.nombre, 'UTC') AS time_zone
  FROM public.usuario u
  LEFT JOIN public.zona_horaria zh
    ON zh.id = u.id_zona_horaria
  WHERE auth.uid() IS NOT NULL
    AND u.auth_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_notification_user_context() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_notification_user_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_notification_user_context() TO authenticated;

-- =========================================================
-- RPC para marcar como leída
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id INT)
RETURNS public.notificacion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_notification public.notificacion;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  UPDATE public.notificacion n
  SET
    leida = true,
    fecha_lectura = COALESCE(n.fecha_lectura, now())
  WHERE n.id = notification_id
    AND EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id = n.id_usuario
        AND u.auth_id = auth.uid()
    )
  RETURNING n.*
  INTO updated_notification;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN updated_notification;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(INT) TO authenticated;

-- =========================================================
-- RPC para marcar como no leída
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_notification_as_unread(notification_id INT)
RETURNS public.notificacion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_notification public.notificacion;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  UPDATE public.notificacion n
  SET
    leida = false,
    fecha_lectura = NULL
  WHERE n.id = notification_id
    AND EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id = n.id_usuario
        AND u.auth_id = auth.uid()
    )
  RETURNING n.*
  INTO updated_notification;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN updated_notification;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_as_unread(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_unread(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_unread(INT) TO authenticated;

-- =========================================================
-- Supabase Realtime con Postgres Changes
-- =========================================================

ALTER TABLE public.notificacion REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notificacion'
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.notificacion;
  END IF;
END $$;

-- =========================================================
-- Máximo 100 notificaciones por usuario
--    Primero borra la leída más antigua
--    Si no hay leídas, borra la más antigua
-- =========================================================

CREATE OR REPLACE FUNCTION public.trim_notifications_to_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  excess_count INT;
BEGIN
  SELECT GREATEST(COUNT(*) - 100, 0)::INT
  INTO excess_count
  FROM public.notificacion
  WHERE id_usuario = NEW.id_usuario;

  IF excess_count <= 0 THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.notificacion
  WHERE id IN (
    SELECT id
    FROM public.notificacion
    WHERE id_usuario = NEW.id_usuario
    ORDER BY
      CASE WHEN leida THEN 0 ELSE 1 END ASC,
      fecha_envio ASC,
      fecha_lectura ASC NULLS LAST,
      id ASC
    LIMIT excess_count
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trim_notifications_after_insert
ON public.notificacion;

CREATE TRIGGER trim_notifications_after_insert
AFTER INSERT
ON public.notificacion
FOR EACH ROW
EXECUTE FUNCTION public.trim_notifications_to_user_limit();

REVOKE EXECUTE ON FUNCTION public.trim_notifications_to_user_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trim_notifications_to_user_limit() FROM anon;

COMMIT;