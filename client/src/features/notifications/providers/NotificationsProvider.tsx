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
import { subscribeToNotificationChanges } from '../services/notificationsRealtimeService';
import type {
  NotificationRecord,
  NotificationsContextValue,
  NotificationsState,
  NotificationUserContext,
} from '../types/notification.types';
import { NotificationsContext } from './NotificationsContext';
import { useUser } from '@/core/auth/userContext';

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
  | { type: 'SET_ERROR'; error: string | null };

const initialState: NotificationsState = {
  notifications: [],
  userContext: null,
  isLoading: false,
  error: null,
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
        error: null,
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

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    default:
      return state;
  }
}

export function NotificationsProvider({ children }: Props) {
  const { user, loading: userLoading } = useUser();
  const loadedUserIdRef = useRef<number | null>(null);
  const silentRetryTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
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

  useEffect(() => {
    if (userLoading || !userId) {
      return;
    }

    const clearSilentRetry = () => {
      if (silentRetryTimeoutRef.current) {
        window.clearTimeout(silentRetryTimeoutRef.current);
        silentRetryTimeoutRef.current = null;
      }
    };

    const scheduleSilentRetry = () => {
      if (silentRetryTimeoutRef.current) {
        return;
      }

      silentRetryTimeoutRef.current = window.setTimeout(() => {
        silentRetryTimeoutRef.current = null;
        void loadInitialData({ silent: true });
      }, 3000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void loadInitialData({ silent: true }).then((success) => {
        if (success) {
          clearSilentRetry();
          return;
        }

        scheduleSilentRetry();
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearSilentRetry();
    };
  }, [userLoading, userId, loadInitialData]);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!userId) {
      loadedUserIdRef.current = null;
      dispatch({ type: 'RESET' });
      return;
    }

    if (loadedUserIdRef.current === userId) {
      return;
    }

    loadedUserIdRef.current = userId;
    void loadInitialData();
  }, [userLoading, userId, loadInitialData]);

  useEffect(() => {
    if (userLoading || !userId || !state.userContext?.idUsuario) {
      return;
    }

    const unsubscribe = subscribeToNotificationChanges({
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
      onError: (message) => {
        dispatch({
          type: 'SET_ERROR',
          error: message,
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [userLoading, userId, state.userContext?.idUsuario]);

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
      loadedUserIdRef.current = null;
      dispatch({ type: 'RESET' });
      return;
    }

    await loadInitialData();
  }, [userLoading, userId, loadInitialData]);

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