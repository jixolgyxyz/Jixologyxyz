import {
  BellIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import type { NotificationRecord } from '../types/notification.types';
import { getNotificationProjectPath } from '../utils/notificationPresentation';
import NotificationProjectActionButton from './NotificationProjectActionButton';
import styles from './NotificationDetailPanel/NotificationDetailPanel.module.css';

type Props = {
  notification: NotificationRecord;
  userTimeZone: string;
  isTogglingRead: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onToggleReadStatus: () => void | Promise<void>;
  onDelete: () => void;
  onNavigate: (path: string) => void;
};

export default function ProjectNotificationDetailPanel({
  notification,
  userTimeZone,
  isTogglingRead,
  isDeleting,
  onClose,
  onToggleReadStatus,
  onDelete,
  onNavigate,
}: Props) {
  const projectPath = getNotificationProjectPath(notification);

  return (
    <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
      <div className={styles.topBar}>
        <span className={styles.badge}>
          <BellIcon width={13} height={13} />
          Cambio de proyecto
        </span>

        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.readBtn}
            onClick={onToggleReadStatus}
            disabled={isTogglingRead}
            title={notification.leida ? 'Marcar como no leída' : 'Marcar como leída'}
          >
            {notification.leida ? (
              <>
                <EnvelopeIcon width={14} height={14} /> No leída
              </>
            ) : (
              <>
                <EnvelopeOpenIcon width={14} height={14} /> Leída
              </>
            )}
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={onDelete}
            disabled={isDeleting}
            title="Eliminar notificación"
            aria-label="Eliminar"
          >
            <TrashIcon width={16} height={16} />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <XMarkIcon width={18} height={18} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <h1 className={styles.title}>{notification.nombre}</h1>

          <span
            className={`${styles.statusBadge} ${
              notification.leida ? styles.statusRead : styles.statusUnread
            }`}
          >
            {!notification.leida && <span className={styles.unreadDot} />}
            {notification.leida ? 'Leída' : 'No leída'}
          </span>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Descripción</span>
            {notification.descripcion ? (
              <p className={styles.description}>{notification.descripcion}</p>
            ) : (
              <span className={styles.noDescription}>Sin descripción.</span>
            )}
          </div>

          {projectPath && (
            <div className={styles.primaryActionArea}>
              <NotificationProjectActionButton
                path={projectPath}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Proyecto</span>
            <span className={styles.detailValue}>
              {notification.nombre_proyecto ?? 'No disponible'}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Fecha de envío</span>
            <span className={styles.detailValue}>
              {formatDateTime(notification.fecha_envio, { timeZone: userTimeZone })}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Estado</span>
            <span className={styles.detailValue}>
              {notification.leida ? 'Leída' : 'No leída'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
