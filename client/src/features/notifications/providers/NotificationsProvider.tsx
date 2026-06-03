import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  deleteNotificationById,
  getCurrentNotificationUserContext,
  getNotificationDetail,
  getNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
} from '../services/notificationsService';
import {
  subscribeToNotificationChanges,
  type NotificationRealtimeSubscription,
} from '../services/notificationsRealtimeService';
import type {
  NotificationRealtimeStatus,
  NotificationRecord,
  NotificationsContextValue,
  NotificationsState,
  NotificationUserContext,
} from '../types/notification.types';
import { NotificationsContext } from './NotificationsContext';
import { useUser } from '@/core/auth/userContext';
import { supabase } from '@/core/supabase/supabase.client';

type Props = {
  children: ReactNode;
};

type NotificationsAction =
  | { type: 'RESET' }
  | { type: 'LOAD_START' }
  | {
      type: 'LOAD_SUCCESS';
      notifications: NotificationRecord[];
      userContext: NotificationUserContext;
    }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'UPSERT_NOTIFICATION'; notification: NotificationRecord }
  | { type: 'REMOVE_NOTIFICATION'; notificationId: number }
  | {
      type: 'SET_REALTIME_STATE';
      status: NotificationRealtimeStatus;
      error?: string | null;
    }
  | { type: 'SET_REALTIME_ERROR'; error: string | null };

const initialState: NotificationsState = {
  notifications: [],
  userContext: null,
  isLoading: false,
  hasLoadedInitialData: false,
  error: null,
  realtimeError: null,
  realtimeStatus: 'idle',
};

function sortNotifications(notifications: NotificationRecord[]): NotificationRecord[] {
  return [...notifications].sort((a, b) => {
    const dateDiff =
      new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return b.id - a.id;
  });
}

function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState {
  switch (action.type) {
    case 'RESET':
      return initialState;

    case 'LOAD_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        hasLoadedInitialData: true,
        error: null,
        realtimeError: null,
        userContext: action.userContext,
        notifications: sortNotifications(action.notifications),
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case 'UPSERT_NOTIFICATION': {
      const withoutCurrent = state.notifications.filter(
        (notification) => notification.id !== action.notification.id,
      );

      return {
        ...state,
        notifications: sortNotifications([
          action.notification,
          ...withoutCurrent,
        ]),
      };
    }

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.notificationId,
        ),
      };

    case 'SET_REALTIME_STATE':
      return {
        ...state,
        realtimeStatus: action.status,
        realtimeError:
          action.error === undefined ? state.realtimeError : action.error,
      };

    case 'SET_REALTIME_ERROR':
      return {
        ...state,
        realtimeError: action.error,
      };

    default:
      return state;
  }
}

export function NotificationsProvider({ children }: Props) {
  const { user, loading: userLoading } = useUser();
  const loadedUserIdRef = useRef<number | null>(null);
  const notificationUserIdRef = useRef<number | null>(null);
  const realtimeSubscriptionRef =
    useRef<NotificationRealtimeSubscription | null>(null);
  const silentRefreshTimeoutRef = useRef<number | null>(null);
  const silentRetryTimeoutRef = useRef<number | null>(null);
  const realtimeReconnectTimeoutRef = useRef<number | null>(null);
  const userId = user?.id ?? null;
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  const loadInitialData = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      const isSilent = options?.silent === true;

      if (!isSilent) {
        dispatch({ type: 'LOAD_START' });
      }

      try {
        const [userContext, notifications] = await Promise.all([
          getCurrentNotificationUserContext(),
          getNotifications(),
        ]);

        dispatch({
          type: 'LOAD_SUCCESS',
          userContext,
          notifications,
        });

        return true;
      } catch (error) {
        if (isSilent) {
          return false;
        }

        dispatch({
          type: 'LOAD_ERROR',
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las notificaciones.',
        });

        return false;
      }
    },
    [],
  );

  const clearSilentRetry = useCallback(() => {
    if (silentRetryTimeoutRef.current === null) return;

    window.clearTimeout(silentRetryTimeoutRef.current);
    silentRetryTimeoutRef.current = null;
  }, []);

  const clearScheduledRealtimeWork = useCallback(() => {
    if (silentRefreshTimeoutRef.current !== null) {
      window.clearTimeout(silentRefreshTimeoutRef.current);
      silentRefreshTimeoutRef.current = null;
    }

    clearSilentRetry();

    if (realtimeReconnectTimeoutRef.current !== null) {
      window.clearTimeout(realtimeReconnectTimeoutRef.current);
      realtimeReconnectTimeoutRef.current = null;
    }
  }, [clearSilentRetry]);

  const scheduleSilentRetry = useCallback(() => {
    if (silentRetryTimeoutRef.current !== null) return;

    silentRetryTimeoutRef.current = window.setTimeout(() => {
      silentRetryTimeoutRef.current = null;

      void loadInitialData({ silent: true }).then((success) => {
        if (success) {
          dispatch({ type: 'SET_REALTIME_ERROR', error: null });
        }
      });
    }, 3000);
  }, [loadInitialData]);

  const queueSilentRefetch = useCallback(
    (options?: { delayMs?: number; retryOnFailure?: boolean }) => {
      if (silentRefreshTimeoutRef.current !== null) return;

      silentRefreshTimeoutRef.current = window.setTimeout(() => {
        silentRefreshTimeoutRef.current = null;

        void loadInitialData({ silent: true }).then((success) => {
          if (success) {
            clearSilentRetry();
            dispatch({ type: 'SET_REALTIME_ERROR', error: null });
            return;
          }

          if (options?.retryOnFailure) {
            scheduleSilentRetry();
          }
        });
      }, options?.delayMs ?? 0);
    },
    [clearSilentRetry, loadInitialData, scheduleSilentRetry],
  );

  const queueRealtimeReconnect = useCallback(() => {
    if (realtimeReconnectTimeoutRef.current !== null) return;

    realtimeReconnectTimeoutRef.current = window.setTimeout(() => {
      realtimeReconnectTimeoutRef.current = null;
      realtimeSubscriptionRef.current?.reconnect();
    }, 150);
  }, []);

  useEffect(() => {
    if (userLoading || !userId) {
      return;
    }

    const recoverVisibleSession = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      queueSilentRefetch({ retryOnFailure: true });
      queueRealtimeReconnect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recoverVisibleSession();
      }
    };

    const handleOnline = () => {
      dispatch({
        type: 'SET_REALTIME_STATE',
        status: 'reconnecting',
        error: null,
      });
      recoverVisibleSession();
    };

    const handleOffline = () => {
      dispatch({
        type: 'SET_REALTIME_STATE',
        status: 'error',
        error: 'La conexión de red se perdió temporalmente.',
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', recoverVisibleSession);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', recoverVisibleSession);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    userLoading,
    userId,
    queueSilentRefetch,
    queueRealtimeReconnect,
  ]);

  useEffect(() => {
    notificationUserIdRef.current = state.userContext?.idUsuario ?? null;
  }, [state.userContext?.idUsuario]);

  useEffect(
    () => () => {
      clearScheduledRealtimeWork();

      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
    },
    [clearScheduledRealtimeWork],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;

      void supabase.realtime
        .setAuth(token)
        .then(() => {
          if (!token) {
            realtimeSubscriptionRef.current?.unsubscribe();
            realtimeSubscriptionRef.current = null;
            dispatch({
              type: 'SET_REALTIME_STATE',
              status: 'disabled',
              error: null,
            });
            return;
          }

          if (notificationUserIdRef.current !== null) {
            dispatch({
              type: 'SET_REALTIME_STATE',
              status: 'reconnecting',
              error: null,
            });
            queueRealtimeReconnect();
          }
        })
        .catch((error) => {
          console.error('[notifications realtime] auth refresh error:', error);
          dispatch({
            type: 'SET_REALTIME_STATE',
            status: 'error',
            error: 'No se pudo actualizar la sesion de Realtime.',
          });
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queueRealtimeReconnect]);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!userId) {
      clearScheduledRealtimeWork();
      loadedUserIdRef.current = null;
      notificationUserIdRef.current = null;
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
      dispatch({ type: 'RESET' });
      return;
    }

    if (loadedUserIdRef.current === userId) {
      return;
    }

    clearScheduledRealtimeWork();
    loadedUserIdRef.current = userId;
    void loadInitialData();
  }, [userLoading, userId, loadInitialData, clearScheduledRealtimeWork]);

  useEffect(() => {
    if (userLoading || !userId || !state.userContext?.idUsuario) {
      return;
    }

    realtimeSubscriptionRef.current?.unsubscribe();

    dispatch({
      type: 'SET_REALTIME_STATE',
      status: 'connecting',
      error: null,
    });

    const subscription = subscribeToNotificationChanges({
      userId: state.userContext.idUsuario,
      onInsert: (notification) => {
        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification,
        });
      },
      onUpdate: (notification) => {
        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification,
        });
      },
      onDelete: (notificationId) => {
        dispatch({
          type: 'REMOVE_NOTIFICATION',
          notificationId,
        });
      },
      onStatusChange: (status) => {
        dispatch({
          type: 'SET_REALTIME_STATE',
          status,
          error: status === 'subscribed' ? null : undefined,
        });
      },
      onError: (message) => {
        dispatch({
          type: 'SET_REALTIME_ERROR',
          error: message,
        });
      },
      onSubscribed: () => {
        queueSilentRefetch({ retryOnFailure: false });
      },
      onRefreshNeeded: () => {
        queueSilentRefetch({ delayMs: 250, retryOnFailure: true });
      },
    });
    realtimeSubscriptionRef.current = subscription;

    return () => {
      if (realtimeSubscriptionRef.current === subscription) {
        realtimeSubscriptionRef.current = null;
      }

      subscription.unsubscribe();
    };
  }, [
    userLoading,
    userId,
    state.userContext?.idUsuario,
    queueSilentRefetch,
  ]);

  const getNotificationById = useCallback(
    (id: number) =>
      state.notifications.find((notification) => notification.id === id),
    [state.notifications],
  );

  const loadNotificationById = useCallback(
    async (id: number): Promise<NotificationRecord | null> => {
      const notification = await getNotificationDetail(id);

      if (notification) {
        dispatch({ type: 'UPSERT_NOTIFICATION', notification });
      }

      return notification;
    },
    [],
  );

  const markAsRead = useCallback(
    async (id: number) => {
      const current = state.notifications.find(
        (notification) => notification.id === id,
      );

      if (!current || current.leida) {
        return;
      }

      const optimisticNotification: NotificationRecord = {
        ...current,
        leida: true,
        fecha_lectura: new Date().toISOString(),
      };

      dispatch({
        type: 'UPSERT_NOTIFICATION',
        notification: optimisticNotification,
      });

      try {
        const updatedNotification = await markNotificationAsRead(id);

        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification: updatedNotification,
        });
      } catch (error) {
        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification: current,
        });

        throw error;
      }
    },
    [state.notifications],
  );

  const markAsUnread = useCallback(
    async (id: number) => {
      const current = state.notifications.find(
        (notification) => notification.id === id,
      );

      if (!current || !current.leida) {
        return;
      }

      const optimisticNotification: NotificationRecord = {
        ...current,
        leida: false,
        fecha_lectura: null,
      };

      dispatch({
        type: 'UPSERT_NOTIFICATION',
        notification: optimisticNotification,
      });

      try {
        const updatedNotification = await markNotificationAsUnread(id);

        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification: updatedNotification,
        });
      } catch (error) {
        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification: current,
        });

        throw error;
      }
    },
    [state.notifications],
  );

  const deleteNotification = useCallback(
    async (id: number) => {
      const current = state.notifications.find(
        (notification) => notification.id === id,
      );

      if (!current) {
        return;
      }

      dispatch({ type: 'REMOVE_NOTIFICATION', notificationId: id });

      try {
        await deleteNotificationById(id);
      } catch (error) {
        dispatch({
          type: 'UPSERT_NOTIFICATION',
          notification: current,
        });

        throw error;
      }
    },
    [state.notifications],
  );

  const unreadCount = useMemo(
    () =>
      state.notifications.filter((notification) => !notification.leida).length,
    [state.notifications],
  );

  const readCount = useMemo(
    () =>
      state.notifications.filter((notification) => notification.leida).length,
    [state.notifications],
  );

  const refetch = useCallback(async () => {
    if (userLoading) {
      return;
    }

    if (!userId) {
      clearScheduledRealtimeWork();
      loadedUserIdRef.current = null;
      notificationUserIdRef.current = null;
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
      dispatch({ type: 'RESET' });
      return;
    }

    await loadInitialData();
  }, [userLoading, userId, loadInitialData, clearScheduledRealtimeWork]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      ...state,
      unreadCount,
      readCount,
      refetch,
      getNotificationById,
      loadNotificationById,
      markAsRead,
      markAsUnread,
      deleteNotification,
    }),
    [
      state,
      unreadCount,
      readCount,
      refetch,
      getNotificationById,
      loadNotificationById,
      markAsRead,
      markAsUnread,
      deleteNotification,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
