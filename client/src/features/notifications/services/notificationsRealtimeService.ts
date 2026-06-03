import { supabase } from '@/core/supabase/supabase.client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  NotificationRealtimeStatus,
  NotificationRecord,
} from '../types/notification.types';
import { getNotificationDetail } from './notificationsService';

type SubscribeParams = {
  userId: number;
  onInsert: (notification: NotificationRecord) => void;
  onUpdate: (notification: NotificationRecord) => void;
  onDelete: (notificationId: number) => void;
  onError?: (message: string | null) => void;
  onStatusChange?: (status: NotificationRealtimeStatus) => void;
  onSubscribed?: (event: { isReconnect: boolean }) => void;
  onRefreshNeeded?: () => void;
};

export type NotificationRealtimeSubscription = {
  reconnect: () => void;
  unsubscribe: () => void;
  getStatus: () => NotificationRealtimeStatus;
};

type ActiveSubscriptionEntry = {
  id: number;
  unsubscribe: () => void;
};

const DETAIL_RETRY_DELAYS_MS = [0, 200, 500, 1000];
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_JITTER_MS = 500;

const activeSubscriptionsByUserId = new Map<number, ActiveSubscriptionEntry>();

let nextSubscriptionId = 0;

function wait(ms: number, shouldAbort: () => boolean): Promise<boolean> {
  if (ms <= 0) return Promise.resolve(!shouldAbort());

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(!shouldAbort());
    }, ms);
  });
}

async function loadEnrichedNotification(
  notificationId: number,
  shouldAbort: () => boolean,
): Promise<NotificationRecord | null> {
  let lastError: unknown = null;

  for (const delayMs of DETAIL_RETRY_DELAYS_MS) {
    const canContinue = await wait(delayMs, shouldAbort);
    if (!canContinue) return null;

    try {
      const notification = await getNotificationDetail(notificationId);

      if (notification || shouldAbort()) {
        return notification;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

function getReconnectDelay(attempt: number): number {
  const exponentialDelay = RECONNECT_BASE_DELAY_MS * 2 ** Math.max(attempt - 1, 0);
  const cappedDelay = Math.min(exponentialDelay, RECONNECT_MAX_DELAY_MS);
  const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS);

  return cappedDelay + jitter;
}

function getStatusErrorMessage(status: string): string {
  if (status === 'TIMED_OUT') {
    return 'La conexión Realtime de notificaciones tardó demasiado.';
  }

  if (status === 'CLOSED') {
    return 'La conexión Realtime de notificaciones se cerró temporalmente.';
  }

  return 'No se pudo conectar Realtime de notificaciones.';
}

function removeExistingChannelsForTopic(topic: string): void {
  supabase
    .getChannels()
    .filter((existingChannel) => existingChannel.topic === topic)
    .forEach((existingChannel) => {
      void supabase.removeChannel(existingChannel);
    });
}

export function subscribeToNotificationChanges({
  userId,
  onInsert,
  onUpdate,
  onDelete,
  onError,
  onStatusChange,
  onSubscribed,
  onRefreshNeeded,
}: SubscribeParams): NotificationRealtimeSubscription {
  const subscriptionId = ++nextSubscriptionId;
  const topic = `notifications-postgres-changes:${userId}`;

  let channel: RealtimeChannel | null = null;
  let currentStatus: NotificationRealtimeStatus = 'idle';
  let isCancelled = false;
  let connectGeneration = 0;
  let reconnectAttempt = 0;
  let reconnectTimerId: number | null = null;
  let hasSubscribedOnce = false;

  const emitStatus = (status: NotificationRealtimeStatus) => {
    if (isCancelled) return;

    currentStatus = status;
    onStatusChange?.(status);
  };

  const emitError = (message: string | null) => {
    if (isCancelled) return;

    onError?.(message);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerId === null) return;

    window.clearTimeout(reconnectTimerId);
    reconnectTimerId = null;
  };

  const cleanupChannel = async () => {
    const previousChannel = channel;
    channel = null;

    if (!previousChannel) return;

    try {
      await supabase.removeChannel(previousChannel);
    } catch (error) {
      console.error('[notifications realtime] remove channel error:', error);
    }
  };

  const isStaleConnect = (generation: number) =>
    isCancelled || generation !== connectGeneration;

  const scheduleReconnect = () => {
    if (isCancelled || reconnectTimerId !== null) return;

    reconnectAttempt += 1;
    const delayMs = getReconnectDelay(reconnectAttempt);

    reconnectTimerId = window.setTimeout(() => {
      reconnectTimerId = null;
      void connect('retry');
    }, delayMs);
  };

  const resolveAndApplyNotification = (
    notificationId: number,
    generation: number,
    applyNotification: (notification: NotificationRecord) => void,
    message: string,
  ) => {
    void loadEnrichedNotification(notificationId, () => isStaleConnect(generation))
      .then((notification) => {
        if (isStaleConnect(generation)) return;

        if (!notification) {
          console.warn(
            '[notifications realtime] detail was not available after retries:',
            notificationId,
          );
          emitError(message);
          onRefreshNeeded?.();
          return;
        }

        applyNotification(notification);
      })
      .catch((error) => {
        if (isStaleConnect(generation)) return;

        console.error('[notifications realtime] detail resolve error:', error);
        emitError(message);
        onRefreshNeeded?.();
      });
  };

  const handleUnstableStatus = (
    status: string,
    error: Error | undefined,
  ) => {
    if (isCancelled) return;

    console.error('[notifications realtime] channel status:', status, error);
    emitError(getStatusErrorMessage(status));
    emitStatus('error');
    scheduleReconnect();
  };

  async function connect(reason: 'initial' | 'retry' | 'manual') {
    if (isCancelled) return;

    clearReconnectTimer();

    const generation = ++connectGeneration;
    const isReconnect = hasSubscribedOnce || reason !== 'initial';

    emitStatus(isReconnect ? 'reconnecting' : 'connecting');
    await cleanupChannel();

    if (isStaleConnect(generation)) return;

    try {
      const { data, error } = await supabase.auth.getSession();

      if (isStaleConnect(generation)) return;

      if (error) {
        throw error;
      }

      const token = data.session?.access_token;

      if (!token) {
        emitError('No hay sesion activa para Realtime.');
        emitStatus('disabled');
        return;
      }

      await supabase.realtime.setAuth(token);

      if (isStaleConnect(generation)) return;

      removeExistingChannelsForTopic(topic);

      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacion',
            filter: `id_usuario=eq.${userId}`,
          },
          (payload) => {
            const id = Number((payload.new as { id?: number | string }).id);
            if (!Number.isFinite(id)) return;

            resolveAndApplyNotification(
              id,
              generation,
              onInsert,
              'No se pudo cargar el detalle de la notificación.',
            );
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
            const id = Number((payload.new as { id?: number | string }).id);
            if (!Number.isFinite(id)) return;

            resolveAndApplyNotification(
              id,
              generation,
              onUpdate,
              'No se pudo cargar el detalle actualizado de la notificación.',
            );
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
            if (isStaleConnect(generation)) return;

            const oldRecord = payload.old as {
              id?: number | string;
              id_usuario?: number | string;
            };

            const deletedUserId = Number(oldRecord.id_usuario);
            if (deletedUserId !== userId) return;

            const deletedNotificationId = Number(oldRecord.id);
            if (Number.isFinite(deletedNotificationId)) {
              onDelete(deletedNotificationId);
            }
          },
        )
        .subscribe((status, error) => {
          if (isStaleConnect(generation)) return;

          if (status === 'SUBSCRIBED') {
            reconnectAttempt = 0;
            emitError(null);
            emitStatus('subscribed');
            onSubscribed?.({ isReconnect: hasSubscribedOnce });
            hasSubscribedOnce = true;
            return;
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            handleUnstableStatus(status, error);
          }
        });
    } catch (error) {
      if (isStaleConnect(generation)) return;

      console.error('[notifications realtime] connect error:', error);
      emitError('No se pudo conectar Realtime de notificaciones.');
      emitStatus('error');
      scheduleReconnect();
    }
  }

  const unsubscribe = () => {
    if (isCancelled) return;

    isCancelled = true;
    connectGeneration += 1;
    clearReconnectTimer();

    const activeSubscription = activeSubscriptionsByUserId.get(userId);
    if (activeSubscription?.id === subscriptionId) {
      activeSubscriptionsByUserId.delete(userId);
    }

    void cleanupChannel();
  };

  const existingSubscription = activeSubscriptionsByUserId.get(userId);
  existingSubscription?.unsubscribe();
  activeSubscriptionsByUserId.set(userId, {
    id: subscriptionId,
    unsubscribe,
  });

  void connect('initial');

  return {
    reconnect: () => {
      if (isCancelled) return;

      reconnectAttempt = Math.max(reconnectAttempt, 1);
      void connect('manual');
    },
    unsubscribe,
    getStatus: () => currentStatus,
  };
}
