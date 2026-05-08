import type { ReactNode } from 'react';
import './ConfirmDialog.css';

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  icon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  icon,
  onCancel,
  onConfirm,
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirm-dialog">
      <div className="confirm-dialog__backdrop" onClick={onCancel} />

      <section className="confirm-dialog__panel">
        {icon && <div className="confirm-dialog__icon">{icon}</div>}

        <h2 className="confirm-dialog__title">{title}</h2>
        <p className="confirm-dialog__message">{message}</p>

        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__button confirm-dialog__button--cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="confirm-dialog__button confirm-dialog__button--danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}