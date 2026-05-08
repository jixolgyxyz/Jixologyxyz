import { BellIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationBell.css';

type Props = {
  variant?: 'header' | 'sidebar';
};

export default function NotificationBell({ variant = 'header' }: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      className={`notification-bell notification-bell--${variant}`}
      onClick={() => navigate('/notificaciones')}
    >
      <div className="notification-bell__icon-slot">
        <BellIcon className="notification-bell__icon" />

        {unreadCount > 0 && (
          <span className="notification-bell__badge">{badgeLabel}</span>
        )}
      </div>

      {variant === 'sidebar' && (
        <span className="notification-bell__text">
          <b>Notificaciones</b>
        </span>
      )}
    </button>
  );
}