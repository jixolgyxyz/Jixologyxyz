import { supabase } from '@/core/supabase/supabase.client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NotificationRecord } from '../types/notification.types';

type SubscribeParams = {
  userId: number;
  onInsert: (notification: NotificationRecord) => void;
  onUpdate: (notification: NotificationRecord) => void;
  onDelete: (notificationId: number) => void;
  onError?: (message: string | null) => void;
};

function isNotificationRecord(
  value: Partial<NotificationRecord>,
): value is NotificationRecord {
  return (
    typeof value.id === 'number' &&
    typeof value.nombre === 'string' &&
    typeof value.leida === 'boolean' &&
    typeof value.fecha_envio === 'string' &&
    typeof value.id_usuario === 'number'
  );
}

export function subscribeToNotificationChanges({
  userId,
  onInsert,
  onUpdate,
  onDelete,
  onError,
}: SubscribeParams): () => void {
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  void supabase.auth.getSession().then(({ data, error }) => {
    if (isCancelled) {
      return;
    }

    if (error) {
      console.error('[notifications realtime] session error:', error);
      onError?.('No se pudo obtener la sesión para Realtime.');
      return;
    }

    const token = data.session?.access_token;

    if (!token) {
      console.warn('[notifications realtime] missing session token');
      onError?.('No hay sesión activa para Realtime.');
      return;
    }

    supabase.realtime.setAuth(token);

    const channelName = `notifications-postgres-changes:${userId}`;


    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacion',
          filter: `id_usuario=eq.${userId}`,
        },
        (payload) => {

          const newRecord = payload.new as Partial<NotificationRecord>;

          if (isNotificationRecord(newRecord)) {
            onInsert(newRecord);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacion',
          filter: `id_usuario=eq.${userId}`,
        },
        (payload) => {

          const newRecord = payload.new as Partial<NotificationRecord>;

          if (isNotificationRecord(newRecord)) {
            onUpdate(newRecord);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notificacion',
        },
        (payload) => {

          const oldRecord = payload.old as Partial<NotificationRecord>;

          if (oldRecord.id_usuario !== userId) {
            return;
          }

          if (typeof oldRecord.id === 'number') {
            onDelete(oldRecord.id);
          }
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          onError?.(null);
          return;
        }

        if (status === 'CHANNEL_ERROR') {
          console.error('[notifications realtime] channel error:', error);
          onError?.('No se pudo conectar Realtime de notificaciones.');
          return;
        }

        if (status === 'TIMED_OUT') {
          console.error('[notifications realtime] timed out:', error);
          onError?.('La conexión Realtime tardó demasiado.');
        }
      });
  });

  return () => {
    isCancelled = true;

    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}