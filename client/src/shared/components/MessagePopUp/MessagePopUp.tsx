import React from 'react';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import styles from './MessagePopUp.module.css';

export type MessagePopUpType = 'error' | 'warning' | 'notification';

export interface MessagePopUpProps {
  type: MessagePopUpType;
  title: string;
  message: string;
  onClose?: () => void;
}

const ICON_MAP: Record<MessagePopUpType, React.FC<{ className?: string }>> = {
  error:        (p) => <ExclamationCircleIcon   {...p} />,
  warning:      (p) => <ExclamationTriangleIcon {...p} />,
  notification: (p) => <CheckCircleIcon         {...p} />,
};

const MessagePopUp: React.FC<MessagePopUpProps> = ({ type, title, message, onClose }) => {
  const Icon = ICON_MAP[type];

  return (
    <div className={`${styles.popup} ${styles[`popup--${type}`]}`} role="alert">
      <div className={styles.iconWrap}>
        <Icon className={styles.icon} />
      </div>

      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>

      {onClose && (
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          <XMarkIcon style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
};

export default MessagePopUp;
