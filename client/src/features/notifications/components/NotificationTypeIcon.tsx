import type { NotificationTypeCode } from '../types/notification.types';
import { NOTIFICATION_TYPE_ICON_CONFIG } from './notificationTypeIconConfig';

type Props = {
  tipo: NotificationTypeCode;
  isRead?: boolean;
  size?: number;
};

export default function NotificationTypeIcon({ tipo, isRead = true, size = 36 }: Props) {
  const config = NOTIFICATION_TYPE_ICON_CONFIG[tipo];

  const bg    = isRead ? config.bg    : config.color;
  const color = isRead ? config.color : '#ffffff';

  return (
    <span
      className="notification-type-icon"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: bg,
        color,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s ease, color 0.2s ease',
      }}
    >
      <span style={{ width: size * 0.52, height: size * 0.52, display: 'flex' }}>
        {config.icon}
      </span>
    </span>
  );
}
