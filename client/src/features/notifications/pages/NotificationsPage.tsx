import { TrashIcon, BellIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState/EmptyState';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import LoadingState from '@/shared/components/LoadingState/LoadingState';
import NotificationItem from '../components/NotificationItem';
import NotificationDetailPanel from '../components/NotificationDetailPanel/NotificationDetailPanel';
import InvitacionItem from '../components/InvitacionItem/InvitacionItem';
import NotificationTabs from '../components/NotificationTabs';
import { useNotifications } from '../hooks/useNotifications';
import { useInvitaciones } from '../hooks/useInvitaciones';
import type { NotificationTabFilter } from '../types/notification.types';
import type { NotificationRecord } from '../types/notification.types';
import type { InvitacionPendienteRecord } from '../types/invitacion.types';
import SearchBarComponent from '@/shared/components/SearchBarComponent/SearchBarComponent';
import './NotificationsPage.css';

type UnifiedItem =
  | { kind: 'notification'; data: NotificationRecord }
  | { kind: 'invitacion';   data: InvitacionPendienteRecord };

export default function NotificationsPage() {
	const {
		notifications,
		unreadCount,
		readCount,
		userContext,
		isLoading,
		error,
		refetch,
		markAsRead,
		markAsUnread,
		deleteNotification,
	} = useNotifications();

  const { invitaciones, loadingIds: invLoadingIds, onAccept, onDeny } = useInvitaciones();

	const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<NotificationTabFilter>('all');
  const [markingAsReadIds, setMarkingAsReadIds] = useState<number[]>([]);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
	const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);
  const [viewingNotification, setViewingNotification] = useState<NotificationRecord | null>(null);
  const [panelTogglingRead, setPanelTogglingRead] = useState(false);
  const panelDeleting = isDeletingConfirmed && pendingDeleteIds.includes(viewingNotification?.id ?? -1);

  // ── Filtered notifications (unchanged logic) ──────────────────
	const filteredNotifications = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		const notificationsByTab = notifications.filter((notification) => {
			if (activeTab === 'unread') return !notification.leida;
			if (activeTab === 'read')   return notification.leida;
			return true;
		});

		if (!normalizedSearch) return notificationsByTab;

		return notificationsByTab.filter((notification) => {
			const name        = notification.nombre.toLowerCase();
			const description = notification.descripcion?.toLowerCase() ?? '';
			return name.includes(normalizedSearch) || description.includes(normalizedSearch);
		});
	}, [activeTab, notifications, search]);

  // ── Unified list: invitations + notifications merged by date ──
  const unifiedItems = useMemo((): UnifiedItem[] => {
    const q = search.trim().toLowerCase();

    // Invitations are always "unread" — show in 'all' and 'unread' tabs
    const invItems: UnifiedItem[] = activeTab !== 'read'
      ? invitaciones
          .filter(inv =>
            !q ||
            inv.nombre_proyecto.toLowerCase().includes(q) ||
            (inv.descripcion?.toLowerCase() ?? '').includes(q)
          )
          .map(inv => ({ kind: 'invitacion' as const, data: inv }))
      : [];

    const notifItems: UnifiedItem[] = filteredNotifications.map(
      n => ({ kind: 'notification' as const, data: n })
    );

    return [...invItems, ...notifItems].sort(
      (a, b) => new Date(b.data.fecha_envio).getTime() - new Date(a.data.fecha_envio).getTime()
    );
  }, [filteredNotifications, invitaciones, activeTab, search]);

  const filteredNotificationIds = useMemo(
    () => filteredNotifications.map((n) => n.id),
    [filteredNotifications],
  );

  const areAllFilteredSelected =
    filteredNotificationIds.length > 0 &&
    filteredNotificationIds.every((id) => selectedIds.includes(id));

	const unreadSelectedCount = selectedIds.filter((id) => {
		const n = notifications.find((item) => item.id === id);
		return n && !n.leida;
	}).length;

	const readSelectedCount = selectedIds.filter((id) => {
		const n = notifications.find((item) => item.id === id);
		return n && n.leida;
	}).length;

  const emptyTitle = useMemo(() => {
    if (activeTab === 'unread') return 'No tienes notificaciones sin leer';
    if (activeTab === 'read')   return 'No tienes notificaciones leídas';
    return 'No tienes notificaciones';
  }, [activeTab]);

	const handleTabChange = (tab: NotificationTabFilter) => {
		setActiveTab(tab);
		setSelectedIds([]);
		setIsSelectionMode(false);
	};

  const handleToggleSelected = (notificationId: number) => {
    setSelectedIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId]
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((current) =>
      areAllFilteredSelected
        ? current.filter((id) => !filteredNotificationIds.includes(id))
        : Array.from(new Set([...current, ...filteredNotificationIds]))
    );
  };

	const handleStartSelection  = () => setIsSelectionMode(true);
	const handleClearSelection  = () => { setSelectedIds([]); setIsSelectionMode(false); };

  const handleRequestDeleteOne      = (id: number) => setPendingDeleteIds([id]);
  const handleRequestDeleteSelected = () => { if (selectedIds.length > 0) setPendingDeleteIds(selectedIds); };
  const handleCancelDelete          = () => { if (!isDeletingConfirmed) setPendingDeleteIds([]); };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;
    setIsDeletingConfirmed(true);
    setDeletingIds((current) => Array.from(new Set([...current, ...pendingDeleteIds])));

		try {
			await Promise.all(pendingDeleteIds.map((id) => deleteNotification(id)));
			setSelectedIds([]);
			setIsSelectionMode(false);
			setPendingDeleteIds([]);
      if (viewingNotification && pendingDeleteIds.includes(viewingNotification.id)) {
        setViewingNotification(null);
      }
		} finally {
			setDeletingIds((current) => current.filter((id) => !pendingDeleteIds.includes(id)));
			setIsDeletingConfirmed(false);
		}
  };

	const handleToggleReadStatus = async (notificationId: number) => {
		const notification = notifications.find((item) => item.id === notificationId);
		if (!notification) return;

		setMarkingAsReadIds((current) =>
			current.includes(notificationId) ? current : [...current, notificationId],
		);

		try {
			if (notification.leida) { await markAsUnread(notificationId); return; }
			await markAsRead(notificationId);
		} finally {
			setMarkingAsReadIds((current) => current.filter((id) => id !== notificationId));
		}
	};

	const handleMarkSelectedAsRead = async () => {
		const unreadSelectedIds = selectedIds.filter((id) => {
			const n = notifications.find((item) => item.id === id);
			return n && !n.leida;
		});
		if (unreadSelectedIds.length === 0) return;

		setMarkingAsReadIds((current) => Array.from(new Set([...current, ...unreadSelectedIds])));
		try {
			await Promise.all(unreadSelectedIds.map((id) => markAsRead(id)));
			setSelectedIds([]);
			setIsSelectionMode(false);
		} finally {
			setMarkingAsReadIds((current) => current.filter((id) => !unreadSelectedIds.includes(id)));
		}
	};

	const handleMarkSelectedAsUnread = async () => {
		const readSelectedIds = selectedIds.filter((id) => {
			const n = notifications.find((item) => item.id === id);
			return n && n.leida;
		});
		if (readSelectedIds.length === 0) return;

		setMarkingAsReadIds((current) => Array.from(new Set([...current, ...readSelectedIds])));
		try {
			await Promise.all(readSelectedIds.map((id) => markAsUnread(id)));
			setSelectedIds([]);
			setIsSelectionMode(false);
		} finally {
			setMarkingAsReadIds((current) => current.filter((id) => !readSelectedIds.includes(id)));
		}
	};

  const handleOpenDetail = async (notification: NotificationRecord) => {
    setViewingNotification(notification);
    // Auto-mark as read when opening the panel
    if (!notification.leida) {
      await markAsRead(notification.id);
    }
  };

  const handlePanelToggleRead = async () => {
    if (!viewingNotification) return;
    setPanelTogglingRead(true);
    try {
      if (viewingNotification.leida) {
        await markAsUnread(viewingNotification.id);
      } else {
        await markAsRead(viewingNotification.id);
      }
      // Sync the viewed notification with updated state
      const updated = notifications.find(n => n.id === viewingNotification.id);
      if (updated) setViewingNotification(updated);
    } finally {
      setPanelTogglingRead(false);
    }
  };

  const handlePanelDelete = () => {
    if (!viewingNotification) return;
    setPendingDeleteIds([viewingNotification.id]);
  };

	const emptySubtitle = search.trim()
		? 'No se encontraron notificaciones que coincidan con tu búsqueda.'
		: 'Cuando existan notificaciones para esta sección, aparecerán aquí.';

	if (isLoading && notifications.length === 0) {
		return <main className="notifications-page"><LoadingState message="Cargando notificaciones..." /></main>;
	}

	if (error && notifications.length === 0) {
		return (
			<main className="notifications-page">
				<ErrorState
					title="No se pudieron cargar las notificaciones"
					message={error}
					actionLabel="Reintentar"
					onAction={refetch}
				/>
			</main>
		);
	}

  const hasAnyContent = notifications.length > 0 || invitaciones.length > 0;

	return (
    <main className="notifications-page">
      <section className="notifications-page__header">
        <div>
          <h1 className="notifications-page__title">Notificaciones</h1>
          <p className="notifications-page__description">
            Consulta tus avisos recientes y administra cuáles ya leíste.
          </p>
        </div>

        <NotificationTabs
          activeTab={activeTab}
          totalCount={notifications.length}
          unreadCount={unreadCount}
          readCount={readCount}
          onChange={handleTabChange}
        />
      </section>

			{hasAnyContent && (
				<section className="notifications-page__toolbar">
					<div className="notifications-page__search">
						<SearchBarComponent
							infoText="Buscar notificación por nombre o descripción..."
							onChange={setSearch}
							fontSize="0.95rem"
							height="48px"
						/>
					</div>

					<div className="notifications-page__toolbar-actions">
						{!isSelectionMode ? (
							<button type="button" className="notifications-page__toolbar-button" onClick={handleStartSelection}>
								Seleccionar
							</button>
						) : (
							<>
								<button type="button" className="notifications-page__toolbar-button" onClick={handleToggleSelectAll}>
									{areAllFilteredSelected ? 'Quitar selección' : 'Seleccionar todas'}
								</button>

								<span className="notifications-page__selection-count">
									{selectedIds.length} seleccionada{selectedIds.length === 1 ? '' : 's'}
								</span>

								<button type="button" className="notifications-page__toolbar-button notifications-page__toolbar-button--danger" onClick={handleRequestDeleteSelected} disabled={selectedIds.length === 0}>
									Eliminar seleccionadas
								</button>

								<button type="button" className="notifications-page__toolbar-button notifications-page__toolbar-button--success" onClick={handleMarkSelectedAsRead} disabled={unreadSelectedCount === 0}>
									Marcar leídas
								</button>

								<button type="button" className="notifications-page__toolbar-button" onClick={handleMarkSelectedAsUnread} disabled={readSelectedCount === 0}>
									Marcar no leídas
								</button>

								<button type="button" className="notifications-page__toolbar-button" onClick={handleClearSelection}>
									Cancelar
								</button>
							</>
						)}
					</div>
				</section>
			)}

      <section className="notifications-page__content">
        {unifiedItems.length === 0 ? (
					<EmptyState
						icon={<BellIcon className="notifications-page__empty-icon" />}
						title={emptyTitle}
						subtitle={emptySubtitle}
					/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unifiedItems.map(item =>
              item.kind === 'invitacion' ? (
                <InvitacionItem
                  key={`inv-${item.data.id}`}
                  invitacion={item.data}
                  userTimeZone={userContext?.timeZone ?? 'UTC'}
                  isLoading={invLoadingIds.includes(item.data.id)}
                  onAccept={() => onAccept(item.data.id)}
                  onDeny={() => onDeny(item.data.id)}
                />
              ) : (
                <NotificationItem
                  key={`notif-${item.data.id}`}
                  notification={item.data}
                  userTimeZone={userContext?.timeZone ?? 'UTC'}
                  isMarkingAsRead={markingAsReadIds.includes(item.data.id)}
                  isDeleting={deletingIds.includes(item.data.id)}
                  isSelected={selectedIds.includes(item.data.id)}
                  isSelectionMode={isSelectionMode}
                  onToggleSelected={() => handleToggleSelected(item.data.id)}
                  onToggleReadStatus={() => handleToggleReadStatus(item.data.id)}
                  onDelete={() => handleRequestDeleteOne(item.data.id)}
                  onOpenDetail={() => handleOpenDetail(item.data)}
                />
              )
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingDeleteIds.length > 0}
        title={pendingDeleteIds.length === 1 ? 'Eliminar notificación' : 'Eliminar notificaciones'}
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

      {viewingNotification && (
        <NotificationDetailPanel
          notification={
            // Always show the latest read state from the notifications list
            notifications.find(n => n.id === viewingNotification.id) ?? viewingNotification
          }
          userTimeZone={userContext?.timeZone ?? 'UTC'}
          isTogglingRead={panelTogglingRead}
          isDeleting={panelDeleting}
          onClose={() => setViewingNotification(null)}
          onToggleReadStatus={handlePanelToggleRead}
          onDelete={handlePanelDelete}
        />
      )}
    </main>
  );
}
