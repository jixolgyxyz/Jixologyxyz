BEGIN;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_invitacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id IN (
    SELECT d.id_notificacion
    FROM public.notificacion_invitacion_proyecto d
    WHERE d.id_invitacion_proyecto = OLD.id
  );

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_invitacion_aceptada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.aceptada = true AND OLD.aceptada IS DISTINCT FROM true THEN
    DELETE FROM public.notificacion n
    WHERE n.id IN (
      SELECT d.id_notificacion
      FROM public.notificacion_invitacion_proyecto d
      WHERE d.id_invitacion_proyecto = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_backlog_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id IN (
    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_cambio d
    WHERE d.id_backlog_item = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_creacion d
    WHERE d.id_backlog_item = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_vencimiento d
    WHERE d.id_backlog_item = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_sugerencia d
    WHERE d.id_backlog_item = OLD.id

    UNION

    SELECT r.id_notificacion
    FROM public.notificacion_backlog_item_vencimiento_registro r
    WHERE r.id_backlog_item = OLD.id
      AND r.id_notificacion IS NOT NULL
  );

  DELETE FROM public.notificacion_backlog_item_vencimiento_registro r
  WHERE r.id_backlog_item = OLD.id;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_sugerencia_aceptada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.aceptada = true AND OLD.aceptada IS DISTINCT FROM true THEN
    DELETE FROM public.notificacion n
    WHERE n.id IN (
      SELECT d.id_notificacion
      FROM public.notificacion_backlog_item_sugerencia d
      WHERE d.id_backlog_item = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_sugerencia_borrada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id IN (
    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_sugerencia d
    WHERE d.id_backlog_item = OLD.id
  );

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_proyecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id IN (
    SELECT d.id_notificacion
    FROM public.notificacion_proyecto d
    WHERE d.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_invitacion_proyecto d
    JOIN public.invitacion_proyecto ip
      ON ip.id = d.id_invitacion_proyecto
    WHERE ip.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_sugerencia d
    JOIN public.backlog_item bi
      ON bi.id = d.id_backlog_item
    WHERE bi.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_cambio d
    WHERE d.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_creacion d
    WHERE d.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_backlog_item_vencimiento d
    WHERE d.id_proyecto = OLD.id

    UNION

    SELECT d.id_notificacion
    FROM public.notificacion_sprint_vencimiento d
    WHERE d.id_proyecto = OLD.id

    UNION

    SELECT r.id_notificacion
    FROM public.notificacion_backlog_item_vencimiento_registro r
    JOIN public.backlog_item bi
      ON bi.id = r.id_backlog_item
    WHERE bi.id_proyecto = OLD.id
      AND r.id_notificacion IS NOT NULL

    UNION

    SELECT r.id_notificacion
    FROM public.notificacion_sprint_vencimiento_registro r
    JOIN public.sprint s
      ON s.id = r.id_sprint
    WHERE s.id_proyecto = OLD.id
      AND r.id_notificacion IS NOT NULL
  );

  DELETE FROM public.notificacion_backlog_item_vencimiento_registro r
  USING public.backlog_item bi
  WHERE bi.id = r.id_backlog_item
    AND bi.id_proyecto = OLD.id;

  DELETE FROM public.notificacion_sprint_vencimiento_registro r
  USING public.sprint s
  WHERE s.id = r.id_sprint
    AND s.id_proyecto = OLD.id;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_vencimiento_backlog_item_resuelto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.es_terminal = true
     OR NEW.fecha_vencimiento IS DISTINCT FROM OLD.fecha_vencimiento THEN

    DELETE FROM public.notificacion n
    WHERE n.id IN (
      SELECT d.id_notificacion
      FROM public.notificacion_backlog_item_vencimiento d
      WHERE d.id_backlog_item = NEW.id

      UNION

      SELECT r.id_notificacion
      FROM public.notificacion_backlog_item_vencimiento_registro r
      WHERE r.id_backlog_item = NEW.id
        AND r.id_notificacion IS NOT NULL
    );

    DELETE FROM public.notificacion_backlog_item_vencimiento_registro r
    WHERE r.id_backlog_item = NEW.id
      AND (
        NEW.es_terminal = true
        OR r.fecha_vencimiento_notificada IS DISTINCT FROM NEW.fecha_vencimiento
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_borrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id IN (
    SELECT d.id_notificacion
    FROM public.notificacion_sprint_vencimiento d
    WHERE d.id_sprint = OLD.id

    UNION

    SELECT r.id_notificacion
    FROM public.notificacion_sprint_vencimiento_registro r
    WHERE r.id_sprint = OLD.id
      AND r.id_notificacion IS NOT NULL
  );

  DELETE FROM public.notificacion_sprint_vencimiento_registro r
  WHERE r.id_sprint = OLD.id;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_resuelto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_es_terminal boolean;
BEGIN
  SELECT es.es_terminal
  INTO v_es_terminal
  FROM public.estatus_sprint es
  WHERE es.id = NEW.id_estatus;

  IF COALESCE(v_es_terminal, false) = true
     OR NEW.fecha_final IS DISTINCT FROM OLD.fecha_final THEN

    DELETE FROM public.notificacion n
    WHERE n.id IN (
      SELECT d.id_notificacion
      FROM public.notificacion_sprint_vencimiento d
      WHERE d.id_sprint = NEW.id

      UNION

      SELECT r.id_notificacion
      FROM public.notificacion_sprint_vencimiento_registro r
      WHERE r.id_sprint = NEW.id
        AND r.id_notificacion IS NOT NULL
    );

    DELETE FROM public.notificacion_sprint_vencimiento_registro r
    WHERE r.id_sprint = NEW.id
      AND (
        COALESCE(v_es_terminal, false) = true
        OR r.fecha_final_notificada IS DISTINCT FROM NEW.fecha_final
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_notificaciones_de_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.notificacion n
  WHERE n.id_usuario = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_invitacion ON public.invitacion_proyecto;
DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_invitacion_aceptada ON public.invitacion_proyecto;

CREATE TRIGGER trg_eliminar_notificaciones_de_invitacion
BEFORE DELETE ON public.invitacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_invitacion();

CREATE TRIGGER trg_eliminar_notificaciones_de_invitacion_aceptada
AFTER UPDATE OF aceptada ON public.invitacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_invitacion_aceptada();

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_backlog_item ON public.backlog_item;
DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_backlog_item ON public.backlog_item;
DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_backlog_item_resuelto ON public.backlog_item;

CREATE TRIGGER trg_eliminar_notificaciones_de_backlog_item
BEFORE DELETE ON public.backlog_item
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_backlog_item();

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_backlog_item_resuelto
AFTER UPDATE OF es_terminal, fecha_vencimiento ON public.backlog_item
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_backlog_item_resuelto();

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_sugerencia_aceptada ON public.backlog_item_sugerencia_creacion;
DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_sugerencia_borrada ON public.backlog_item_sugerencia_creacion;

CREATE TRIGGER trg_eliminar_notificaciones_de_sugerencia_aceptada
AFTER UPDATE OF aceptada ON public.backlog_item_sugerencia_creacion
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_sugerencia_aceptada();

CREATE TRIGGER trg_eliminar_notificaciones_de_sugerencia_borrada
BEFORE DELETE ON public.backlog_item_sugerencia_creacion
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_sugerencia_borrada();

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_proyecto ON public.proyecto;

CREATE TRIGGER trg_eliminar_notificaciones_de_proyecto
BEFORE DELETE ON public.proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_proyecto();

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_sprint_borrado ON public.sprint;
DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_sprint_resuelto ON public.sprint;

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_sprint_borrado
BEFORE DELETE ON public.sprint
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_borrado();

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_sprint_resuelto
AFTER UPDATE OF id_estatus, fecha_final ON public.sprint
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_resuelto();

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_usuario ON public.usuario;

CREATE TRIGGER trg_eliminar_notificaciones_de_usuario
BEFORE DELETE ON public.usuario
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_usuario();

COMMIT;