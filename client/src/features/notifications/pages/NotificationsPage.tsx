import { TrashIcon, BellIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState/EmptyState';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import LoadingState from '@/shared/components/LoadingState/LoadingState';
import SearchBarComponent from '@/shared/components/SearchBarComponent/SearchBarComponent';
import NotificationItem from '../components/NotificationItem';
import NotificationTabs from '../components/NotificationTabs';
import NotificationTypeFilter from '../components/NotificationTypeFilter';
import NotificationDetailRouter from '../components/NotificationDetailRouter';
import { useNotifications } from '../hooks/useNotifications';
import type {
  NotificationRecord,
  NotificationTabFilter,
  NotificationTypeFilter as NotificationTypeFilterValue,
} from '../types/notification.types';
import { getNotificationSearchText } from '../utils/notificationPresentation';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    readCount,
    userContext,
    isLoading,
    hasLoadedInitialData,
    error,
    realtimeError,
    realtimeStatus,
    refetch,
    markAsRead,
    markAsUnread,
    deleteNotification,
  } = useNotifications();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<NotificationTabFilter>('unread');
  const [typeFilter, setTypeFilter] =
    useState<NotificationTypeFilterValue>('all');

  const [markingAsReadIds, setMarkingAsReadIds] = useState<number[]>([]);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);
  const [viewingNotification, setViewingNotification] =
    useState<NotificationRecord | null>(null);
  const [panelTogglingRead, setPanelTogglingRead] = useState(false);

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (activeTab === 'unread' && notification.leida) return false;
      if (activeTab === 'read' && !notification.leida) return false;

      if (typeFilter !== 'all' && notification.tipo_codigo !== typeFilter) {
        return false;
      }

      if (!q) return true;

      return getNotificationSearchText(notification).includes(q);
    });
  }, [activeTab, notifications, search, typeFilter]);

  const filteredNotificationIds = useMemo(
    () => filteredNotifications.map((notification) => notification.id),
    [filteredNotifications],
  );

  const areAllFilteredSelected =
    filteredNotificationIds.length > 0 &&
    filteredNotificationIds.every((id) => selectedIds.includes(id));

  const unreadSelectedCount = selectedIds.filter((id) => {
    const notification = notifications.find((item) => item.id === id);
    return notification && !notification.leida;
  }).length;

  const readSelectedCount = selectedIds.filter((id) => {
    const notification = notifications.find((item) => item.id === id);
    return notification && notification.leida;
  }).length;

  const emptyTitle = useMemo(() => {
    if (activeTab === 'unread') return 'No tienes notificaciones sin leer';
    if (activeTab === 'read') return 'No tienes notificaciones leídas';
    if (typeFilter !== 'all') return 'No hay notificaciones de este tipo';
    return 'No tienes notificaciones';
  }, [activeTab, typeFilter]);

  const handleTabChange = (tab: NotificationTabFilter) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleTypeFilterChange = (nextType: NotificationTypeFilterValue) => {
    setTypeFilter(nextType);
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleOpenDetail = async (notification: NotificationRecord) => {
    setViewingNotification(notification);

    if (!notification.leida) {
      setMarkingAsReadIds((current) => [...current, notification.id]);

      try {
        await markAsRead(notification.id);
      } finally {
        setMarkingAsReadIds((current) =>
          current.filter((id) => id !== notification.id),
        );
      }
    }
  };

  const handleToggleSelected = (notificationId: number) => {
    setSelectedIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId],
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((current) =>
      areAllFilteredSelected
        ? current.filter((id) => !filteredNotificationIds.includes(id))
        : Array.from(new Set([...current, ...filteredNotificationIds])),
    );
  };

  const handleToggleReadStatus = async (notificationId: number) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) return;

    setMarkingAsReadIds((current) => [...current, notificationId]);

    try {
      if (notification.leida) {
        await markAsUnread(notificationId);
      } else {
        await markAsRead(notificationId);
      }
    } finally {
      setMarkingAsReadIds((current) =>
        current.filter((id) => id !== notificationId),
      );
    }
  };

  const handlePanelToggleRead = async () => {
    if (!viewingNotification) return;

    setPanelTogglingRead(true);

    try {
      const current =
        notifications.find((item) => item.id === viewingNotification.id) ??
        viewingNotification;

      if (current.leida) {
        await markAsUnread(current.id);
      } else {
        await markAsRead(current.id);
      }
    } finally {
      setPanelTogglingRead(false);
    }
  };

  const handleRequestDeleteOne = (id: number) => setPendingDeleteIds([id]);

  const handleRequestDeleteSelected = () => {
    if (selectedIds.length > 0) setPendingDeleteIds(selectedIds);
  };

  const handleCancelDelete = () => {
    if (!isDeletingConfirmed) setPendingDeleteIds([]);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;

    const idsToDelete = [...pendingDeleteIds];

    setIsDeletingConfirmed(true);
    setDeletingIds((current) => Array.from(new Set([...current, ...idsToDelete])));

    try {
      await Promise.all(idsToDelete.map((id) => deleteNotification(id)));

      setSelectedIds([]);
      setIsSelectionMode(false);
      setPendingDeleteIds([]);

      if (
        viewingNotification &&
        idsToDelete.includes(viewingNotification.id)
      ) {
        setViewingNotification(null);
      }
    } finally {
      setDeletingIds((current) =>
        current.filter((id) => !idsToDelete.includes(id)),
      );
      setIsDeletingConfirmed(false);
    }
  };

  const latestViewingNotification =
    viewingNotification
      ? notifications.find((item) => item.id === viewingNotification.id) ??
        viewingNotification
      : null;

  if (isLoading && !hasLoadedInitialData) return <LoadingState />;

  if (error && !hasLoadedInitialData) {
    return (
      <ErrorState
        title="No se pudieron cargar las notificaciones"
        message={error}
        onAction={refetch}
      />
    );
  }

  return (
    <main className="notifications-page">
      <header className="notifications-page__header">
        <div>
          <h1 className="notifications-page__title">Notificaciones</h1>
          <p className="notifications-page__description">
            Revisa cambios de proyecto, backlog items, sprints e invitaciones.
          </p>
        </div>
      </header>

      {error && hasLoadedInitialData && (
        <div className="notifications-page__inline-alert" role="status">
          {error}
        </div>
      )}

      {realtimeError &&
        hasLoadedInitialData &&
        realtimeStatus !== 'subscribed' && (
          <div
            className="notifications-page__inline-alert notifications-page__inline-alert--realtime"
            role="status"
          >
            {realtimeError}
          </div>
        )}

      <NotificationTabs
        activeTab={activeTab}
        totalCount={notifications.length}
        unreadCount={unreadCount}
        readCount={readCount}
        onChange={handleTabChange}
      />

      <section className="notifications-page__toolbar">
        <div className="notifications-page__search">
          <SearchBarComponent
            value={search}
            onChange={setSearch}
            placeholder="Buscar notificaciones..."
          />
        </div>

        <NotificationTypeFilter
          value={typeFilter}
          onChange={handleTypeFilterChange}
        />

        <div className="notifications-page__toolbar-actions">
          {!isSelectionMode ? (
            <button
              type="button"
              className="notifications-page__toolbar-button"
              onClick={() => setIsSelectionMode(true)}
              disabled={filteredNotifications.length === 0}
            >
              Seleccionar
            </button>
          ) : (
            <>
              <span className="notifications-page__selection-count">
                {selectedIds.length} seleccionadas
              </span>

              <button
                type="button"
                className="notifications-page__toolbar-button"
                onClick={handleToggleSelectAll}
              >
                {areAllFilteredSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>

              {unreadSelectedCount > 0 && (
                <button
                  type="button"
                  className="notifications-page__toolbar-button notifications-page__toolbar-button--success"
                  onClick={() =>
                    Promise.all(selectedIds.map((id) => markAsRead(id)))
                  }
                >
                  Marcar leídas
                </button>
              )}

              {readSelectedCount > 0 && (
                <button
                  type="button"
                  className="notifications-page__toolbar-button"
                  onClick={() =>
                    Promise.all(selectedIds.map((id) => markAsUnread(id)))
                  }
                >
                  Marcar no leídas
                </button>
              )}

              <button
                type="button"
                className="notifications-page__toolbar-button notifications-page__toolbar-button--danger"
                onClick={handleRequestDeleteSelected}
                disabled={selectedIds.length === 0}
              >
                Eliminar
              </button>

              <button
                type="button"
                className="notifications-page__toolbar-button"
                onClick={() => {
                  setSelectedIds([]);
                  setIsSelectionMode(false);
                }}
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="notifications-page__empty-icon" />}
          title={emptyTitle}
          subtitle="Cuando haya novedades, aparecerán aquí."
        />
      ) : (
        <section className="notification-list">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              userTimeZone={userContext?.timeZone ?? 'UTC'}
              isMarkingAsRead={markingAsReadIds.includes(notification.id)}
              isDeleting={deletingIds.includes(notification.id)}
              isSelected={selectedIds.includes(notification.id)}
              isSelectionMode={isSelectionMode}
              onToggleSelected={() => handleToggleSelected(notification.id)}
              onToggleReadStatus={() => handleToggleReadStatus(notification.id)}
              onDelete={() => handleRequestDeleteOne(notification.id)}
              onOpenDetail={() => handleOpenDetail(notification)}
            />
          ))}
        </section>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteIds.length > 0}
        title={
          pendingDeleteIds.length === 1
            ? 'Eliminar notificación'
            : 'Eliminar notificaciones'
        }
        message={
          pendingDeleteIds.length === 1
            ? '¿Seguro que quieres eliminar esta notificación? Esta acción no se puede deshacer.'
            : `¿Seguro que quieres eliminar ${pendingDeleteIds.length} notificaciones? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeletingConfirmed}
        icon={<TrashIcon />}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      {latestViewingNotification && (
        <div
          className="notifications-page__overlay"
          onClick={() => setViewingNotification(null)}
        >
          <NotificationDetailRouter
            notification={latestViewingNotification}
            userTimeZone={userContext?.timeZone ?? 'UTC'}
            isTogglingRead={panelTogglingRead}
            isDeleting={
              isDeletingConfirmed &&
              pendingDeleteIds.includes(latestViewingNotification.id)
            }
            onClose={() => setViewingNotification(null)}
            onToggleReadStatus={handlePanelToggleRead}
            onDelete={() => handleRequestDeleteOne(latestViewingNotification.id)}
            onAfterAction={refetch}
          />
        </div>
      )}
    </main>
  );
}
