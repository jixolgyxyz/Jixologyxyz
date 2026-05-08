import { TrashIcon } from '@heroicons/react/24/outline';
import ActionIconButton from '@/shared/components/ActionIconButton/ActionIconButton';

type Props = {
  isLoading?: boolean;
  onDelete: () => void;
};

export default function NotificationDeleteButton({
  isLoading = false,
  onDelete,
}: Props) {
  return (
    <ActionIconButton
      icon={<TrashIcon />}
      variant="danger"
      disabled={isLoading}
      onClick={onDelete}
      title="Borrar notificación"
    />
  );
}