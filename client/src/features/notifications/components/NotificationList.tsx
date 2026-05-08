import type { NotificationRecord } from '../types/notification.types';
import NotificationItem from './NotificationItem';
import './NotificationList.css';

type Props = {
  notifications: NotificationRecord[];
  userTimeZone: string;
  markingAsReadIds: number[];
  deletingIds: number[];
  selectedIds: number[];
  isSelectionMode: boolean;
  onToggleSelected: (notificationId: number) => void;
  onToggleReadStatus: (notificationId: number) => void | Promise<void>;
  onDelete: (notificationId: number) => void;
  onOpenDetail: (notification: NotificationRecord) => void;
};

export default function NotificationList({
  notifications,
  userTimeZone,
  markingAsReadIds,
  deletingIds,
  selectedIds,
  isSelectionMode,
  onToggleSelected,
  onToggleReadStatus,
  onDelete,
  onOpenDetail,
}: Props) {
  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          userTimeZone={userTimeZone}
          isMarkingAsRead={markingAsReadIds.includes(notification.id)}
          isDeleting={deletingIds.includes(notification.id)}
          isSelected={selectedIds.includes(notification.id)}
          isSelectionMode={isSelectionMode}
          onToggleSelected={() => onToggleSelected(notification.id)}
          onToggleReadStatus={() => onToggleReadStatus(notification.id)}
          onDelete={() => onDelete(notification.id)}
          onOpenDetail={() => onOpenDetail(notification)}
        />
      ))}
    </div>
  );
}