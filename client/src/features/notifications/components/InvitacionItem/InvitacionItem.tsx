import { CheckIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { InvitacionPendienteRecord } from '../../types/invitacion.types';
import { formatDateTime } from '@/shared/datetime/formatDateTime';
import './InvitacionItem.css';

interface InvitacionItemProps {
  invitacion: InvitacionPendienteRecord;
  userTimeZone: string;
  isLoading: boolean;
  onAccept: () => void;
  onDeny: () => void;
}

export default function InvitacionItem({
  invitacion,
  userTimeZone,
  isLoading,
  onAccept,
  onDeny,
}: InvitacionItemProps) {
  return (
    <article className="invitacion-item">
      <div className="notification-item__main">
        <div className="notification-item__header">
          <div className="notification-item__title-group">
            <span className="invitacion-item__dot" />
            <h2 className="notification-item__title">
              Invitación:{' '}
              <span className="invitacion-item__project-name">
                {invitacion.nombre_proyecto}
              </span>
            </h2>
          </div>
        </div>

        {invitacion.descripcion && (
          <p className="notification-item__description">{invitacion.descripcion}</p>
        )}

        <div className="notification-item__meta">
          <span>
            Recibida:{' '}
            {formatDateTime(invitacion.fecha_envio, { timeZone: userTimeZone })}
          </span>
        </div>
      </div>

      <div className="notification-item__actions invitacion-item__actions">
        <button
          type="button"
          className="invitacion-item__btn invitacion-item__btn--accept"
          disabled={isLoading}
          onClick={onAccept}
          title="Aceptar invitación"
        >
          <CheckIcon width={13} height={13} />
          Aceptar
        </button>

        <button
          type="button"
          className="invitacion-item__btn invitacion-item__btn--deny"
          disabled={isLoading}
          onClick={onDeny}
          title="Rechazar invitación"
        >
          <XMarkIcon width={13} height={13} />
          Rechazar
        </button>

        <UserGroupIcon className="invitacion-item__type-icon" aria-label="Invitación a proyecto" />
      </div>
    </article>
  );
}
