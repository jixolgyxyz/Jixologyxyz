ALTER TABLE public.backlog_item_sugerencia_creacion
  DROP CONSTRAINT IF EXISTS backlog_item_sugerencia_creacion_id_fkey,
  ADD CONSTRAINT backlog_item_sugerencia_creacion_id_fkey
  FOREIGN KEY (id)
  REFERENCES public.backlog_item(id)
  ON DELETE CASCADE;

BEGIN;

-- =========================================================
--  Si una fila detalle desaparece, elimina la notificación base.
--    Esto cubre eliminaciones manuales o por ON DELETE CASCADE desde
--    entidades de negocio
-- =========================================================

CREATE OR REPLACE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF OLD.id_notificacion IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.notificacion n
  WHERE n.id = OLD.id_notificacion
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_invitacion_proyecto d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_proyecto d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_backlog_item_sugerencia d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_backlog_item_cambio d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_backlog_item_creacion d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_backlog_item_vencimiento d
      WHERE d.id_notificacion = OLD.id_notificacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacion_sprint_vencimiento d
      WHERE d.id_notificacion = OLD.id_notificacion
    );

  RETURN OLD;
END;
$$;


-- =========================================================
-- Triggers AFTER DELETE en tablas detalle.
-- =========================================================

DROP TRIGGER IF EXISTS trg_detalle_invitacion_borrado_eliminar_notificacion
ON public.notificacion_invitacion_proyecto;

CREATE TRIGGER trg_detalle_invitacion_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_invitacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_proyecto_borrado_eliminar_notificacion
ON public.notificacion_proyecto;

CREATE TRIGGER trg_detalle_proyecto_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_sugerencia_borrado_eliminar_notificacion
ON public.notificacion_backlog_item_sugerencia;

CREATE TRIGGER trg_detalle_sugerencia_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_backlog_item_sugerencia
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_backlog_cambio_borrado_eliminar_notificacion
ON public.notificacion_backlog_item_cambio;

CREATE TRIGGER trg_detalle_backlog_cambio_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_backlog_item_cambio
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_backlog_creacion_borrado_eliminar_notificacion
ON public.notificacion_backlog_item_creacion;

CREATE TRIGGER trg_detalle_backlog_creacion_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_backlog_item_creacion
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_backlog_vencimiento_borrado_eliminar_notificacion
ON public.notificacion_backlog_item_vencimiento;

CREATE TRIGGER trg_detalle_backlog_vencimiento_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_backlog_item_vencimiento
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


DROP TRIGGER IF EXISTS trg_detalle_sprint_vencimiento_borrado_eliminar_notificacion
ON public.notificacion_sprint_vencimiento;

CREATE TRIGGER trg_detalle_sprint_vencimiento_borrado_eliminar_notificacion
AFTER DELETE ON public.notificacion_sprint_vencimiento
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificacion_base_si_detalle_borrado();


-- =========================================================
-- Cambiar FKs detalle -> entidad de negocio:
--    RESTRICT -> CASCADE
-- =========================================================

ALTER TABLE public.notificacion_backlog_item_cambio
  DROP CONSTRAINT IF EXISTS notificacion_backlog_item_cambio_backlog_fkey;

ALTER TABLE public.notificacion_backlog_item_cambio
  ADD CONSTRAINT notificacion_backlog_item_cambio_backlog_fkey
  FOREIGN KEY (id_backlog_item, id_proyecto)
  REFERENCES public.backlog_item(id, id_proyecto)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_backlog_item_creacion
  DROP CONSTRAINT IF EXISTS notificacion_backlog_item_creacion_backlog_fkey;

ALTER TABLE public.notificacion_backlog_item_creacion
  ADD CONSTRAINT notificacion_backlog_item_creacion_backlog_fkey
  FOREIGN KEY (id_backlog_item, id_proyecto)
  REFERENCES public.backlog_item(id, id_proyecto)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_backlog_item_sugerencia
  DROP CONSTRAINT IF EXISTS notificacion_backlog_item_sugerencia_backlog_fkey;

ALTER TABLE public.notificacion_backlog_item_sugerencia
  ADD CONSTRAINT notificacion_backlog_item_sugerencia_backlog_fkey
  FOREIGN KEY (id_backlog_item)
  REFERENCES public.backlog_item_sugerencia_creacion(id)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_backlog_item_vencimiento
  DROP CONSTRAINT IF EXISTS notificacion_backlog_item_vencimiento_backlog_fkey;

ALTER TABLE public.notificacion_backlog_item_vencimiento
  ADD CONSTRAINT notificacion_backlog_item_vencimiento_backlog_fkey
  FOREIGN KEY (id_backlog_item, id_proyecto)
  REFERENCES public.backlog_item(id, id_proyecto)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_backlog_item_vencimiento
  DROP CONSTRAINT IF EXISTS notificacion_backlog_item_vencimiento_proyecto_fkey;

ALTER TABLE public.notificacion_backlog_item_vencimiento
  ADD CONSTRAINT notificacion_backlog_item_vencimiento_proyecto_fkey
  FOREIGN KEY (id_proyecto)
  REFERENCES public.proyecto(id)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_invitacion_proyecto
  DROP CONSTRAINT IF EXISTS notificacion_invitacion_proyecto_invitacion_fkey;

ALTER TABLE public.notificacion_invitacion_proyecto
  ADD CONSTRAINT notificacion_invitacion_proyecto_invitacion_fkey
  FOREIGN KEY (id_invitacion_proyecto)
  REFERENCES public.invitacion_proyecto(id)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_proyecto
  DROP CONSTRAINT IF EXISTS notificacion_proyecto_proyecto_fkey;

ALTER TABLE public.notificacion_proyecto
  ADD CONSTRAINT notificacion_proyecto_proyecto_fkey
  FOREIGN KEY (id_proyecto)
  REFERENCES public.proyecto(id)
  ON DELETE CASCADE;


ALTER TABLE public.notificacion_sprint_vencimiento
  DROP CONSTRAINT IF EXISTS notificacion_sprint_vencimiento_sprint_fkey;

ALTER TABLE public.notificacion_sprint_vencimiento
  ADD CONSTRAINT notificacion_sprint_vencimiento_sprint_fkey
  FOREIGN KEY (id_sprint, id_proyecto)
  REFERENCES public.sprint(id, id_proyecto)
  ON DELETE CASCADE;


-- =========================================================
--   Usuario destinatario -> notificación:
--   si se borra el usuario, sus notificaciones se borran
-- =========================================================

ALTER TABLE public.notificacion
  DROP CONSTRAINT IF EXISTS notificacion_id_usuario_fkey;

ALTER TABLE public.notificacion
  ADD CONSTRAINT notificacion_id_usuario_fkey
  FOREIGN KEY (id_usuario)
  REFERENCES public.usuario(id)
  ON DELETE CASCADE
  DEFERRABLE;


-- =========================================================
--  Refuerzos recomendados del flujo de notificaciones.
--  Estos no son tablas detalle, pero sí pueden bloquear
--  borrado de usuario/backlog item dentro del flujo
-- =========================================================

ALTER TABLE public.suscripcion_notificacion_backlog_item
  DROP CONSTRAINT IF EXISTS suscripcion_notificacion_backlog_item_id_backlog_item_fkey;

ALTER TABLE public.suscripcion_notificacion_backlog_item
  ADD CONSTRAINT suscripcion_notificacion_backlog_item_id_backlog_item_fkey
  FOREIGN KEY (id_backlog_item)
  REFERENCES public.backlog_item(id)
  ON DELETE CASCADE
  DEFERRABLE;


ALTER TABLE public.suscripcion_notificacion_backlog_item
  DROP CONSTRAINT IF EXISTS suscripcion_notificacion_backlog_item_id_usuario_fkey;

ALTER TABLE public.suscripcion_notificacion_backlog_item
  ADD CONSTRAINT suscripcion_notificacion_backlog_item_id_usuario_fkey
  FOREIGN KEY (id_usuario)
  REFERENCES public.usuario(id)
  ON DELETE CASCADE
  DEFERRABLE;


-- Recomendado para que borrar un backlog_item sugerido no sea bloqueado
-- por su fila de sugerencia.
ALTER TABLE public.backlog_item_sugerencia_creacion
  DROP CONSTRAINT IF EXISTS backlog_item_sugerencia_creacion_id_fkey;

ALTER TABLE public.backlog_item_sugerencia_creacion
  ADD CONSTRAINT backlog_item_sugerencia_creacion_id_fkey
  FOREIGN KEY (id)
  REFERENCES public.backlog_item(id)
  ON DELETE CASCADE
  DEFERRABLE;


-- =========================================================
--  Reafirmar triggers de limpieza existentes.
-- =========================================================

DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_backlog_item
ON public.backlog_item;

CREATE TRIGGER trg_eliminar_notificaciones_de_backlog_item
BEFORE DELETE ON public.backlog_item
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_backlog_item();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_invitacion
ON public.invitacion_proyecto;

CREATE TRIGGER trg_eliminar_notificaciones_de_invitacion
BEFORE DELETE ON public.invitacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_invitacion();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_invitacion_aceptada
ON public.invitacion_proyecto;

CREATE TRIGGER trg_eliminar_notificaciones_de_invitacion_aceptada
AFTER UPDATE OF aceptada ON public.invitacion_proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_invitacion_aceptada();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_proyecto
ON public.proyecto;

CREATE TRIGGER trg_eliminar_notificaciones_de_proyecto
BEFORE DELETE ON public.proyecto
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_proyecto();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_sugerencia_aceptada
ON public.backlog_item_sugerencia_creacion;

CREATE TRIGGER trg_eliminar_notificaciones_de_sugerencia_aceptada
AFTER UPDATE OF aceptada ON public.backlog_item_sugerencia_creacion
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_sugerencia_aceptada();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_sugerencia_borrada
ON public.backlog_item_sugerencia_creacion;

CREATE TRIGGER trg_eliminar_notificaciones_de_sugerencia_borrada
BEFORE DELETE ON public.backlog_item_sugerencia_creacion
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_sugerencia_borrada();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_de_usuario
ON public.usuario;

CREATE TRIGGER trg_eliminar_notificaciones_de_usuario
BEFORE DELETE ON public.usuario
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_de_usuario();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_backlog_item_resuelto
ON public.backlog_item;

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_backlog_item_resuelto
AFTER UPDATE OF es_terminal, fecha_vencimiento ON public.backlog_item
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_backlog_item_resuelto();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_sprint_borrado
ON public.sprint;

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_sprint_borrado
BEFORE DELETE ON public.sprint
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_borrado();


DROP TRIGGER IF EXISTS trg_eliminar_notificaciones_vencimiento_sprint_resuelto
ON public.sprint;

CREATE TRIGGER trg_eliminar_notificaciones_vencimiento_sprint_resuelto
AFTER UPDATE OF id_estatus, fecha_final ON public.sprint
FOR EACH ROW
EXECUTE FUNCTION public.eliminar_notificaciones_vencimiento_sprint_resuelto();


COMMIT;