import { supabase } from '@/core/supabase/supabase.client';
import type {
  NotificationRecord,
  NotificationTypeCode,
  NotificationUserContext,
} from '../types/notification.types';

type NotificationUserContextRpcRow = {
  id_usuario: number;
  auth_id: string;
  time_zone: string | null;
};

type NotificationFeedRow = {
  id: number | string;
  nombre: string;
  descripcion: string | null;
  leida: boolean | null;
  fecha_lectura: string | null;
  fecha_envio: string;
  id_usuario: number | string;
  id_tipo_notificacion: number | string;
  tipo_codigo: string | null;
  tipo_nombre: string | null;
  id_invitacion_proyecto: number | string | null;
  invitacion_aceptada: boolean | null;
  id_proyecto_destino: number | string | null;
  id_proyecto_cambio: number | string | null;
  nombre_proyecto: string | null;
  seccion_destino_codigo: string | null;
  seccion_destino_ruta: string | null;
  id_usuario_actor_proyecto: number | string | null;
  id_backlog_item: number | string | null;
  nombre_backlog_item: string | null;
  id_backlog_item_sugerido: number | string | null;
  id_backlog_item_cambio: number | string | null;
  id_backlog_item_creacion: number | string | null;
  id_backlog_item_por_vencer: number | string | null;
  id_sprint: number | string | null;
  nombre_sprint: string | null;
  id_sprint_por_vencer: number | string | null;
  fecha_vencimiento_notificada: string | null;
  fecha_final_notificada: string | null;
};

type SuggestionNotificationIdRow = {
  id: number | string;
};

const NOTIFICATION_FEED_COLUMNS = `
  id,
  nombre,
  descripcion,
  leida,
  fecha_lectura,
  fecha_envio,
  id_usuario,
  id_tipo_notificacion,
  tipo_codigo,
  tipo_nombre,
  id_invitacion_proyecto,
  invitacion_aceptada,
  id_proyecto_cambio,
  id_usuario_actor_proyecto,
  id_proyecto_destino,
  nombre_proyecto,
  seccion_destino_codigo,
  seccion_destino_ruta,
  id_backlog_item,
  nombre_backlog_item,
  id_backlog_item_sugerido,
  id_backlog_item_cambio,
  id_backlog_item_creacion,
  id_backlog_item_por_vencer,
  id_sprint,
  nombre_sprint,
  id_sprint_por_vencer,
  fecha_vencimiento_notificada,
  fecha_final_notificada
`;

const NOTIFICATION_TYPE_CODES: NotificationTypeCode[] = [
  'sistema',
  'invitacion_proyecto',
  'sugerencia_creacion_backlog_item',
  'cambio_proyecto',
  'backlog_item_proximo_vencer',
  'cambio_backlog_item',
  'creacion_backlog_item',
  'sprint_proximo_vencer',
];

function asNotificationTypeCode(value: unknown): NotificationTypeCode {
  return NOTIFICATION_TYPE_CODES.includes(value as NotificationTypeCode)
    ? (value as NotificationTypeCode)
    : 'sistema';
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNotification(row: NotificationFeedRow): NotificationRecord {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    descripcion: row.descripcion ?? null,
    leida: Boolean(row.leida),
    fecha_lectura: row.fecha_lectura ?? null,
    fecha_envio: row.fecha_envio,
    id_usuario: Number(row.id_usuario),

    id_tipo_notificacion: Number(row.id_tipo_notificacion),
    tipo_codigo: asNotificationTypeCode(row.tipo_codigo),
    tipo_nombre: row.tipo_nombre ?? 'Sistema',

    id_invitacion_proyecto: asNumberOrNull(row.id_invitacion_proyecto),
    invitacion_aceptada: row.invitacion_aceptada ?? null,

    id_proyecto_destino: asNumberOrNull(row.id_proyecto_destino),
    id_proyecto_cambio: asNumberOrNull(row.id_proyecto_cambio),
    nombre_proyecto: row.nombre_proyecto ?? null,
    seccion_destino_codigo: row.seccion_destino_codigo ?? null,
    seccion_destino_ruta: row.seccion_destino_ruta ?? null,
    id_usuario_actor_proyecto: asNumberOrNull(row.id_usuario_actor_proyecto),

    id_backlog_item: asNumberOrNull(row.id_backlog_item),
    nombre_backlog_item: row.nombre_backlog_item ?? null,

    id_backlog_item_sugerido: asNumberOrNull(row.id_backlog_item_sugerido),
    id_backlog_item_cambio: asNumberOrNull(row.id_backlog_item_cambio),
    id_backlog_item_creacion: asNumberOrNull(row.id_backlog_item_creacion),
    id_backlog_item_por_vencer: asNumberOrNull(row.id_backlog_item_por_vencer),

    id_sprint: asNumberOrNull(row.id_sprint),
    nombre_sprint: row.nombre_sprint ?? null,
    id_sprint_por_vencer: asNumberOrNull(row.id_sprint_por_vencer),

    fecha_vencimiento_notificada: row.fecha_vencimiento_notificada ?? null,
    fecha_final_notificada: row.fecha_final_notificada ?? null,
  };
}

export async function getCurrentNotificationUserContext(): Promise<NotificationUserContext> {
  const { data, error } = await supabase
    .rpc('get_notification_user_context')
    .single<NotificationUserContextRpcRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No se encontró el usuario autenticado.');

  return {
    idUsuario: data.id_usuario,
    authId: data.auth_id,
    timeZone: data.time_zone ?? 'UTC',
  };
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notificacion_feed_view')
    .select(NOTIFICATION_FEED_COLUMNS)
    .order('fecha_envio', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(normalizeNotification);
}

export async function getNotificationDetail(
  notificationId: number,
): Promise<NotificationRecord | null> {
  const { data, error } = await supabase
    .from('notificacion_feed_view')
    .select(NOTIFICATION_FEED_COLUMNS)
    .eq('id', notificationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? normalizeNotification(data) : null;
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<NotificationRecord> {
  const { error } = await supabase.rpc('mark_notification_as_read', {
    notification_id: notificationId,
  });

  if (error) throw new Error(error.message);

  const updated = await getNotificationDetail(notificationId);

  if (!updated) {
    throw new Error('La notificación fue actualizada, pero ya no está disponible en el feed.');
  }

  return updated;
}

export async function markNotificationAsUnread(
  notificationId: number,
): Promise<NotificationRecord> {
  const { error } = await supabase.rpc('mark_notification_as_unread', {
    notification_id: notificationId,
  });

  if (error) throw new Error(error.message);

  const updated = await getNotificationDetail(notificationId);

  if (!updated) {
    throw new Error('La notificación fue actualizada, pero ya no está disponible en el feed.');
  }

  return updated;
}

export async function deleteNotificationById(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .delete()
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
}

export async function acceptBacklogItemSuggestion(notificationId: number): Promise<void> {
  const { error } = await supabase.rpc(
    'aceptar_sugerencia_creacion_backlog_item',
    { p_id_notificacion: notificationId },
  );

  if (error) throw new Error(error.message);
}

export async function rejectBacklogItemSuggestion(notificationId: number): Promise<void> {
  const { error } = await supabase.rpc(
    'rechazar_sugerencia_creacion_backlog_item',
    { p_id_notificacion: notificationId },
  );

  if (error) throw new Error(error.message);
}

export async function getBacklogItemSuggestionNotificationId(
  backlogItemId: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('notificacion_feed_view')
    .select('id')
    .eq('tipo_codigo', 'sugerencia_creacion_backlog_item')
    .eq('id_backlog_item_sugerido', backlogItemId)
    .eq('sugerencia_aceptada', false)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<SuggestionNotificationIdRow>();

  if (error) throw new Error(error.message);

  return data ? Number(data.id) : null;
}

export async function acceptProjectInvitation(invitacionId: number): Promise<void> {
  const { error } = await supabase.rpc('accept_project_invitation', {
    p_invitacion_id: invitacionId,
  });

  if (error) throw new Error(error.message);
}

export async function denyProjectInvitation(invitacionId: number): Promise<void> {
  const { error } = await supabase.rpc('deny_project_invitation', {
    p_invitacion_id: invitacionId,
  });

  if (error) throw new Error(error.message);
}
