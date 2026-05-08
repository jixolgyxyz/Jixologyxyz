import type { NotificationRecord } from '../types/notification.types';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import NotificationReadButton from './NotificationReadButton';
import NotificationDeleteButton from './NotificationDeleteButton';
import './NotificationItem.css';

type Props = {
  notification: NotificationRecord;
  userTimeZone: string;
  isMarkingAsRead: boolean;
  isDeleting: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelected: () => void;
  onToggleReadStatus: () => void | Promise<void>;
  onDelete: () => void;
  onOpenDetail: () => void;
};

export default function NotificationItem({
  notification,
  userTimeZone,
  isMarkingAsRead,
  isDeleting,
  isSelected,
  isSelectionMode,
  onToggleSelected,
  onToggleReadStatus,
  onDelete,
  onOpenDetail,
}: Props) {
  const handleOpenDetail = () => {
    if (isSelectionMode) {
      onToggleSelected();
      return;
    }
    onOpenDetail();
  };

  return (
    <article
      className={[
        'notification-item',
        notification.leida ? 'notification-item--read' : '',
        isSelected ? 'notification-item--selected' : '',
      ].join(' ')}
      onClick={handleOpenDetail}
    >
      {isSelectionMode && (
        <div
          className="notification-item__select"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelected}
          />
        </div>
      )}

      <div className="notification-item__main">
        <div className="notification-item__header">
          <div className="notification-item__title-group">
            {!notification.leida && (
              <span className="notification-item__unread-dot" />
            )}

            <h2 className="notification-item__title">
              {notification.nombre}
            </h2>
          </div>
        </div>

        {notification.descripcion && (
          <p className="notification-item__description">
            {notification.descripcion}
          </p>
        )}

        <div className="notification-item__meta">
          <span>
            Enviada:{' '}
            {formatDateTime(notification.fecha_envio, {
              timeZone: userTimeZone,
            })}
          </span>

          {notification.fecha_lectura && (
            <span>
              Leída:{' '}
              {formatDateTime(notification.fecha_lectura, {
                timeZone: userTimeZone,
              })}
            </span>
          )}
        </div>
      </div>

      <div
        className="notification-item__actions"
        onClick={(event) => event.stopPropagation()}
      >
        <NotificationReadButton
          isRead={notification.leida}
          isLoading={isMarkingAsRead}
          onToggleReadStatus={onToggleReadStatus}
        />

        <NotificationDeleteButton
          isLoading={isDeleting}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}