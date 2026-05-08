import StatusCheckBox from '@/shared/components/StatusCheckBox/StatusCheckBox';

type Props = {
  isRead: boolean;
  isLoading?: boolean;
  onToggleReadStatus: () => void | Promise<void>;
};

export default function NotificationReadButton({
  isRead,
  isLoading = false,
  onToggleReadStatus,
}: Props) {
  return (
    <StatusCheckBox
      checked={isRead}
      disabled={isLoading}
      onClick={onToggleReadStatus}
      title={isRead ? 'Marcar como no leída' : 'Marcar como leída'}
    />
  );
}