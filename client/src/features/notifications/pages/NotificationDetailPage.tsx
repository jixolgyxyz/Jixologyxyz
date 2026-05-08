import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import FloatingBackButton from '@/shared/components/FloatingBackButton/FloatingBackButton';
import LoadingState from '@/shared/components/LoadingState/LoadingState';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import NotificationReadButton from '../components/NotificationReadButton';
import NotificationDeleteButton from '../components/NotificationDeleteButton';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationRecord } from '../types/notification.types';
import './NotificationDetailPage.css';

export default function NotificationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const notificationId = Number(id);

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);
  const [fallbackNotification, setFallbackNotification] =
    useState<NotificationRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [wasNotFound, setWasNotFound] = useState(false);

  const {
    notifications,
    userContext,
    isLoading,
    loadNotificationById,
    markAsRead,
    markAsUnread,
    deleteNotification,
  } = useNotifications();

  const notificationFromState = notifications.find(
    (item) => item.id === notificationId,
  );

  const notification = notificationFromState ?? fallbackNotification;

  useEffect(() => {
    if (!id || Number.isNaN(notificationId)) {
      return;
    }

    if (notificationFromState) {
      setFallbackNotification(notificationFromState);
      return;
    }

    if (isLoading) {
      return;
    }

    let isActive = true;

    setIsLoadingDetail(true);

    void loadNotificationById(notificationId)
      .then((loadedNotification: NotificationRecord | null) => {
        if (!isActive) return;

        if (!loadedNotification) {
          setWasNotFound(true);
          return;
        }

        setFallbackNotification(loadedNotification);
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    id,
    notificationId,
    notificationFromState,
    isLoading,
    loadNotificationById,
  ]);

  useEffect(() => {
    if (!notification || notification.leida) {
      return;
    }

    void markAsRead(notification.id);
  }, [notification, markAsRead]);

  if (!id || Number.isNaN(notificationId) || wasNotFound) {
    return <Navigate to="/notificaciones" replace />;
  }

  if (isLoading || isLoadingDetail || !notification) {
    return (
      <main className="notification-detail-page">
        <LoadingState message="Cargando notificación..." />
      </main>
    );
  }

  const handleRequestDelete = () => {
    setPendingDeleteId(notification.id);
  };

  const handleCancelDelete = () => {
    if (isDeletingConfirmed) {
      return;
    }

    setPendingDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    setIsDeletingConfirmed(true);

    try {
      await deleteNotification(pendingDeleteId);
      setPendingDeleteId(null);
      navigate('/notificaciones', { replace: true });
    } finally {
      setIsDeletingConfirmed(false);
    }
  };

  const handleToggleReadStatus = async () => {
    if (notification.leida) {
      await markAsUnread(notification.id);
      return;
    }

    await markAsRead(notification.id);
  };

  return (
    <main className="notification-detail-page">
      <div className="notification-detail-page__topbar">
        <FloatingBackButton
          label="Regresar"
          onClick={() => navigate('/notificaciones')}
          fixed={false}
        />

        <div className="notification-detail-page__topbar-actions">
          <NotificationReadButton
            isRead={notification.leida}
            onToggleReadStatus={handleToggleReadStatus}
          />

          <NotificationDeleteButton
            isLoading={isDeletingConfirmed}
            onDelete={handleRequestDelete}
          />
        </div>
      </div>

      <section className="notification-detail-page__card">
        <header className="notification-detail-page__header">
          <div>
            <h1 className="notification-detail-page__title">
              {notification.nombre}
            </h1>

            <p className="notification-detail-page__meta">
              Enviada:{' '}
              {formatDateTime(notification.fecha_envio, {
                timeZone: userContext?.timeZone ?? 'UTC',
              })}
            </p>
          </div>
        </header>

        <div className="notification-detail-page__body">
          <p className="notification-detail-page__description">
            {notification.descripcion}
          </p>
        </div>

        <footer className="notification-detail-page__footer">
          <span>
            Estado: {notification.leida ? 'Leída' : 'No leída'}
          </span>

          {notification.fecha_lectura && (
            <span>
              Fecha de lectura:{' '}
              {formatDateTime(notification.fecha_lectura, {
                timeZone: userContext?.timeZone ?? 'UTC',
              })}
            </span>
          )}
        </footer>
      </section>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="Eliminar notificación"
        message="¿Seguro que quieres eliminar esta notificación? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeletingConfirmed}
        icon={<TrashIcon />}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}