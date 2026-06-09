import { useNavigate } from 'react-router-dom';
import NotificationDetailPanel from './NotificationDetailPanel/NotificationDetailPanel';
import ProjectNotificationDetailPanel from './ProjectNotificationDetailPanel';
import ProjectInvitationNotificationDetailPanel from './ProjectInvitationNotificationDetailPanel';
import SprintNotificationDetailPanel from './SprintNotificationDetailPanel';
import BacklogItemNotificationDetail from './BacklogItemNotificationDetail';
import type { NotificationRecord } from '../types/notification.types';

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

export default function NotificationDetailRouter({
  notification,
  userTimeZone,
  isTogglingRead,
  isDeleting,
  onClose,
  onToggleReadStatus,
  onDelete,
  onAfterAction,
}: Props) {
  const navigate = useNavigate();

  const navigateAndClose = (path: string) => {
    onClose();
    navigate(path);
  };

  switch (notification.tipo_codigo) {
    case 'cambio_proyecto':
      return (
        <ProjectNotificationDetailPanel
          notification={notification}
          userTimeZone={userTimeZone}
          isTogglingRead={isTogglingRead}
          isDeleting={isDeleting}
          onClose={onClose}
          onToggleReadStatus={onToggleReadStatus}
          onDelete={onDelete}
          onNavigate={navigateAndClose}
        />
      );

    case 'sugerencia_creacion_backlog_item':
      return (
        <BacklogItemNotificationDetail
          notification={notification}
          isSuggestion
          onClose={onClose}
          onNavigate={navigateAndClose}
          onAfterAction={onAfterAction}
        />
      );

    case 'cambio_backlog_item':
    case 'creacion_backlog_item':
    case 'backlog_item_proximo_vencer':
    case 'backlog_item_comment_created':
      return (
        <BacklogItemNotificationDetail
          notification={notification}
          onClose={onClose}
          onNavigate={navigateAndClose}
          onAfterAction={onAfterAction}
        />
      );

    case 'sprint_proximo_vencer':
      return (
        <SprintNotificationDetailPanel
          notification={notification}
          userTimeZone={userTimeZone}
          isTogglingRead={isTogglingRead}
          isDeleting={isDeleting}
          onClose={onClose}
          onToggleReadStatus={onToggleReadStatus}
          onDelete={onDelete}
          onNavigate={navigateAndClose}
        />
      );

    case 'invitacion_proyecto':
      return (
        <ProjectInvitationNotificationDetailPanel
          notification={notification}
          userTimeZone={userTimeZone}
          isTogglingRead={isTogglingRead}
          isDeleting={isDeleting}
          onClose={onClose}
          onToggleReadStatus={onToggleReadStatus}
          onDelete={onDelete}
          onAfterAction={onAfterAction}
        />
      );

    case 'sistema':
    default:
      return (
        <NotificationDetailPanel
          notification={notification}
          userTimeZone={userTimeZone}
          isTogglingRead={isTogglingRead}
          isDeleting={isDeleting}
          onClose={onClose}
          onToggleReadStatus={onToggleReadStatus}
          onDelete={onDelete}
        />
      );
  }
}
