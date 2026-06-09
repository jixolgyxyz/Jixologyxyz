import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import styles from './NotificationDetailPanel/NotificationDetailPanel.module.css';

type Props = {
  path: string | null;
  onNavigate: (path: string) => void;
  label?: string;
  className?: string;
};

export default function NotificationProjectActionButton({
  path,
  onNavigate,
  label = 'Ir al proyecto',
  className,
}: Props) {
  if (!path) return null;

  return (
    <button
      type="button"
      className={[
        'notifications-page__toolbar-button',
        'notifications-page__toolbar-button--success',
        styles.projectActionButton,
        className,
      ].filter(Boolean).join(' ')}
      onClick={() => onNavigate(path)}
    >
      <span className={styles.projectActionButtonInner}>
        <ArrowTopRightOnSquareIcon
          className={styles.projectActionButtonIcon}
          aria-hidden="true"
        />
        <span className={styles.projectActionButtonLabel}>{label}</span>
      </span>
    </button>
  );
}