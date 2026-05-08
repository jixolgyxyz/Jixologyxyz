import { supabase } from '@/core/supabase/supabase.client';
import type { NotificationRecord, NotificationUserContext } from '../types/notification.types';

type NotificationUserContextRpcRow = {
  id_usuario: number;
  auth_id: string;
  time_zone: string | null;
};

const NOTIFICATION_COLUMNS =
  'id,nombre,descripcion,leida,fecha_lectura,fecha_envio,id_usuario';

function normalizeNotification(row: NotificationRecord): NotificationRecord {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    leida: row.leida,
    fecha_lectura: row.fecha_lectura,
    fecha_envio: row.fecha_envio,
    id_usuario: row.id_usuario,
  };
}

export async function getCurrentNotificationUserContext(): Promise<NotificationUserContext> {
  const { data, error } = await supabase
    .rpc('get_notification_user_context')
    .single<NotificationUserContextRpcRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No se encontró el usuario autenticado.');
  }

  return {
    idUsuario: data.id_usuario,
    authId: data.auth_id,
    timeZone: data.time_zone ?? 'UTC',
  };
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notificacion')
    .select(NOTIFICATION_COLUMNS)
    .order('fecha_envio', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeNotification(row as NotificationRecord));
}

export async function getNotificationDetail(notificationId: number): Promise<NotificationRecord | null> {
  const { data, error } = await supabase
    .from('notificacion')
    .select(NOTIFICATION_COLUMNS)
    .eq('id', notificationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeNotification(data as NotificationRecord) : null;
}

export async function markNotificationAsRead(notificationId: number): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .rpc('mark_notification_as_read', {
      notification_id: notificationId,
    })
    .single<NotificationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeNotification(data);
}

export async function deleteNotificationById(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .delete()
    .eq('id', notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markNotificationAsUnread(notificationId: number): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .rpc('mark_notification_as_unread', {
      notification_id: notificationId,
    })
    .single<NotificationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeNotification(data);
}