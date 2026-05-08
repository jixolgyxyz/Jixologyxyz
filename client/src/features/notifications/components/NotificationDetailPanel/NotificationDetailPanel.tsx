import { useEffect } from 'react';
import {
  XMarkIcon,
  BellIcon,
  TrashIcon,
  EnvelopeOpenIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import type { NotificationRecord } from '../../types/notification.types';
import styles from './NotificationDetailPanel.module.css';

interface Props {
  notification: NotificationRecord;
  userTimeZone: string;
  isTogglingRead: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onToggleReadStatus: () => void | Promise<void>;
  onDelete: () => void;
}

export default function NotificationDetailPanel({
  notification,
  userTimeZone,
  isTogglingRead,
  isDeleting,
  onClose,
  onToggleReadStatus,
  onDelete,
}: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <span className={styles.badge}>
            <BellIcon width={13} height={13} />
            Notificación
          </span>

          <div className={styles.topBarActions}>
            <button
              type="button"
              className={styles.readBtn}
              onClick={onToggleReadStatus}
              disabled={isTogglingRead}
              title={notification.leida ? 'Marcar como no leída' : 'Marcar como leída'}
            >
              {notification.leida
                ? <><EnvelopeIcon width={14} height={14} /> No leída</>
                : <><EnvelopeOpenIcon width={14} height={14} /> Leída</>
              }
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
              aria-label="Cerrar"
            >
              <XMarkIcon width={18} height={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ── Main content ── */}
          <div className={styles.main}>
            <h1 className={styles.title}>{notification.nombre}</h1>

            <span
              className={`${styles.statusBadge} ${notification.leida ? styles.statusRead : styles.statusUnread}`}
            >
              {!notification.leida && <span className={styles.unreadDot} />}
              {notification.leida ? 'Leída' : 'No leída'}
            </span>

            <div className={styles.section}>
              <span className={styles.sectionTitle}>Descripción</span>
              {notification.descripcion
                ? <p className={styles.description}>{notification.descripcion}</p>
                : <span className={styles.noDescription}>Sin descripción.</span>
              }
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className={styles.sidebar}>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Estado</span>
              <span className={styles.detailValue}>
                {notification.leida ? 'Leída' : 'No leída'}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha de envío</span>
              <span className={styles.detailValue}>
                {formatDateTime(notification.fecha_envio, { timeZone: userTimeZone })}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha de lectura</span>
              {notification.fecha_lectura
                ? <span className={styles.detailValue}>
                    {formatDateTime(notification.fecha_lectura, { timeZone: userTimeZone })}
                  </span>
                : <span className={styles.detailEmpty}>No leída aún</span>
              }
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
