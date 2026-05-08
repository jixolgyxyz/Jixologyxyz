INSERT INTO public.notificacion (
  nombre,
  descripcion,
  leida,
  fecha_lectura,
  id_usuario,
  fecha_envio
)
VALUES
  (
    'Nueva tarea asignada PRUEBA PRESENTACION',
    'SALUDOS.',
    false,
    NULL,
    1,
    now()
  ),
  (
    'Comentario nuevo',
    'Un usuario comentó en una tarea que sigues.',
    false,
    NULL,
    1,
    now() - interval '5 minutes'
  ),
  (
    'Proyecto actualizado',
    'Se actualizaron los datos generales del proyecto.',
    false,
    NULL,
    1,
    now() - interval '15 minutes'
  ),
  (
    'Recordatorio pendiente',
    'Tienes actividades pendientes por revisar.',
    false,
    NULL,
    1,
    now() - interval '30 minutes'
  ),
  (
    'Cambio de estado',
    'Una tarea cambió de estado recientemente.',
    false,
    NULL,
    1,
    now() - interval '1 hour'
  ),
  (
    'Notificación leída',
    'Esta notificación ya fue marcada como leída.',
    true,
    now() - interval '1 hour',
    1,
    now() - interval '2 hours'
  ),
  (
    'Revisión solicitada',
    'Se solicitó tu revisión en un elemento del backlog.',
    false,
    NULL,
    1,
    now() - interval '3 hours'
  ),
  (
    'Nuevo archivo adjunto',
    'Se agregó un archivo a una tarea del proyecto.',
    false,
    NULL,
    1,
    now() - interval '4 hours'
  ),
  (
    'Entrega próxima',
    'Una fecha de entrega está por vencer.',
    true,
    now() - interval '5 hours',
    1,
    now() - interval '6 hours'
  ),
  (
    'Actividad reciente',
    'Hay nueva actividad en uno de tus proyectos.',
    false,
    NULL,
    1,
    now() - interval '8 hours'
  ),
  (
    'Mensaje del sistema',
    'Se realizó una actualización general del sistema.',
    true,
    now() - interval '10 hours',
    1,
    now() - interval '12 hours'
  ),
  (
    'Backlog actualizado',
    'Se modificó un elemento del backlog.',
    false,
    NULL,
    1,
    now() - interval '1 day'
  ),
  (
    'Usuario asignado',
    'Se asignó un nuevo usuario a una tarea.',
    false,
    NULL,
    1,
    now() - interval '2 days'
  ),
  (
    'Tarea completada',
    'Una tarea en la que participas fue completada.',
    true,
    now() - interval '2 days',
    1,
    now() - interval '3 days'
  ),
  (
    'Prioridad cambiada',
    'La prioridad de una tarea fue modificada.',
    false,
    NULL,
    1,
    now() - interval '4 days'
  );