import { useEffect } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import './ProjectCreationToast.css';

type Props = {
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
};

export default function ProjectCreationToast({
  message,
  onClose,
  autoCloseMs = 3500,
}: Props) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCloseMs, onClose]);

  return (
    <div
      className="project-creation-toast"
      role="status"
      aria-live="polite"
    >
      <div className="project-creation-toast__content">
        <div className="project-creation-toast__icon-wrapper" aria-hidden="true">
          <CheckCircleIcon className="project-creation-toast__icon" />
        </div>

        <div className="project-creation-toast__text">
          <p className="project-creation-toast__title">Proyecto creado</p>
          <p className="project-creation-toast__message">{message}</p>
        </div>

        <button
          type="button"
          className="project-creation-toast__close-button"
          onClick={onClose}
          aria-label="Cerrar notificación"
        >
          <XMarkIcon className="project-creation-toast__close-icon" />
        </button>
      </div>
    </div>
  );
}