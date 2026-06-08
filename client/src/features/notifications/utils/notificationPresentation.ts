import type {
  NotificationRecord,
  NotificationTypeCode,
} from '../types/notification.types';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeCode, string> = {
  sistema: 'Sistema',
  invitacion_proyecto: 'Invitación a proyecto',
  sugerencia_creacion_backlog_item: 'Sugerencia de backlog item',
  cambio_proyecto: 'Cambio de proyecto',
  backlog_item_proximo_vencer: 'Backlog item próximo a vencer',
  cambio_backlog_item: 'Cambio de backlog item',
  creacion_backlog_item: 'Creación/asignación de backlog item',
  backlog_item_comment_created: 'Comentario de backlog item',
  sprint_proximo_vencer: 'Sprint próximo a vencer',
};

export function getNotificationProjectPath(
  notification: NotificationRecord,
): string | null {
  if (!notification.id_proyecto_destino) return null;

  if (notification.tipo_codigo === 'cambio_proyecto') {
    return `/proyectos/${notification.id_proyecto_destino}/backlog`;
  }

  const section =
    notification.seccion_destino_ruta ??
    notification.seccion_destino_codigo ??
    'general';

  const basePath =
    `/proyectos/${notification.id_proyecto_destino}/${section.replace(/^\//, '')}`;

  if (notification.tipo_codigo !== 'backlog_item_comment_created') {
    return basePath;
  }

  const backlogItemId = getNotificationBacklogItemId(notification);
  if (backlogItemId === null) return basePath;

  const params = new URLSearchParams({ item: String(backlogItemId) });
  if (notification.id_comentario !== null) {
    params.set('comment', String(notification.id_comentario));
  }

  return `${basePath}?${params.toString()}`;
}

export function getProjectBacklogPath(projectId: number | null): string | null {
  return projectId == null ? null : `/proyectos/${projectId}/backlog`;
}

export function getNotificationProjectBacklogPath(
  notification: NotificationRecord,
): string | null {
  return getProjectBacklogPath(notification.id_proyecto_destino);
}

export function getNotificationBacklogItemId(
  notification: NotificationRecord,
): number | null {
  return (
    notification.id_backlog_item ??
    notification.id_backlog_item_sugerido ??
    notification.id_backlog_item_cambio ??
    notification.id_backlog_item_creacion ??
    notification.id_backlog_item_por_vencer ??
    null
  );
}

export function getNotificationSearchText(notification: NotificationRecord): string {
  return [
    notification.nombre,
    notification.descripcion,
    notification.tipo_nombre,
    notification.nombre_proyecto,
    notification.nombre_backlog_item,
    notification.nombre_sprint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
