import { BellIcon as BellOutlineIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useBacklogItemSubscription } from '../../hooks/useBacklogItemSubscription';
import styles from './BacklogItemSubscriptionButton.module.css';

type BacklogItemSubscriptionButtonProps = {
  backlogItemId: number | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
};

export default function BacklogItemSubscriptionButton({
  backlogItemId,
  className = '',
  size = 'md',
}: BacklogItemSubscriptionButtonProps) {
  const {
    isSubscribed,
    isLoading,
    isToggling,
    error,
    canSubscribe,
    toggle,
  } = useBacklogItemSubscription(backlogItemId);

  if (!canSubscribe) return null;

  const label = isSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones';
  const statusText = isSubscribed ? 'Notificaciones activadas' : 'Notificaciones desactivadas';
  const disabled = isLoading || isToggling;
  const Icon = isSubscribed ? BellSolidIcon : BellOutlineIcon;

  return (
    <span className={`${styles.wrapper} ${className}`}>
      <button
        type="button"
        className={`${styles.button} ${styles[size]} ${isSubscribed ? styles.active : ''} ${isToggling ? styles.toggling : ''}`}
        onClick={() => void toggle()}
        disabled={disabled}
        aria-pressed={isSubscribed}
        aria-label={label}
        title={error ?? label}
      >
        <Icon className={styles.icon} aria-hidden="true" />
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {error ?? statusText}
      </span>
    </span>
  );
}
