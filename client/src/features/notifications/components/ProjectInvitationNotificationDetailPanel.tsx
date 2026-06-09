import { useEffect, useState } from 'react';
import {
  CheckIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import type { NotificationRecord } from '../types/notification.types';
import {
  acceptProjectInvitation,
  denyProjectInvitation,
} from '../services/notificationsService';
import styles from './NotificationDetailPanel/NotificationDetailPanel.module.css';

type Props = {
  notification: NotificationRecord;
  userTimeZone: string;
  isTogglingRead: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onToggleReadStatus: () => void | Promise<void>;
  onDelete: () => void;
  onAfterAction: () => Promise<void>;
};

type InvitationAction = 'accept' | 'deny';

export default function ProjectInvitationNotificationDetailPanel({
  notification,
  userTimeZone,
  isTogglingRead,
  isDeleting,
  onClose,
  onToggleReadStatus,
  onDelete,
  onAfterAction,
}: Props) {
  const [processingAction, setProcessingAction] =
    useState<InvitationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const invitationId = notification.id_invitacion_proyecto;
  const canResolveInvitation =
    invitationId !== null && notification.invitacion_aceptada !== true;
  const isProcessing = processingAction !== null;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAccept = async () => {
    if (invitationId === null) return;

    setActionError(null);
    setProcessingAction('accept');

    try {
      await acceptProjectInvitation(invitationId);
      await onAfterAction();
      onClose();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'No se pudo aceptar la invitación.',
      );
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeny = async () => {
    if (invitationId === null) return;

    setActionError(null);
    setProcessingAction('deny');

    try {
      await denyProjectInvitation(invitationId);
      await onAfterAction();
      onClose();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'No se pudo rechazar la invitación.',
      );
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
      <div className={styles.topBar}>
        <span className={styles.badge}>
          <UserGroupIcon width={13} height={13} />
          Invitación a proyecto
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
            disabled={isDeleting || isProcessing}
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
        <main className={styles.main}>
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

          {canResolveInvitation ? (
            <div className={styles.invitationActionsPanel}>
              <span className={styles.sectionTitle}>Responder invitación</span>

              {actionError && (
                <p className={styles.actionError}>{actionError}</p>
              )}

              <div className={styles.invitationActions}>
                <button
                  type="button"
                  className={`${styles.invitationActionButton} ${styles.invitationActionButtonDeny}`}
                  onClick={handleDeny}
                  disabled={isProcessing}
                >
                  <XMarkIcon width={14} height={14} />
                  {processingAction === 'deny' ? 'Rechazando...' : 'Rechazar'}
                </button>

                <button
                  type="button"
                  className={`${styles.invitationActionButton} ${styles.invitationActionButtonAccept}`}
                  onClick={handleAccept}
                  disabled={isProcessing}
                >
                  <CheckIcon width={14} height={14} />
                  {processingAction === 'accept' ? 'Aceptando...' : 'Aceptar'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.invitationResolved}>
              <CheckIcon width={16} height={16} />
              Invitación ya resuelta.
            </div>
          )}
        </main>

        <aside className={styles.sidebar}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Fecha de envío</span>
            <span className={styles.detailValue}>
              {formatDateTime(notification.fecha_envio, { timeZone: userTimeZone })}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Estado de lectura</span>
            <span className={styles.detailValue}>
              {notification.leida ? 'Leída' : 'No leída'}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Estado de invitación</span>
            <span className={styles.detailValue}>
              {notification.invitacion_aceptada === true
                ? 'Aceptada'
                : 'Pendiente'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
