import './ErrorState.css';

type Props = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

export default function ErrorState({
  title = 'Ocurrió un error',
  message = 'No se pudo completar la operación.',
  actionLabel,
  onAction,
}: Props) {
  return (
    <div className="error-state">
      <div className="error-state__icon">!</div>

      <h2 className="error-state__title">{title}</h2>

      {message && (
        <p className="error-state__message">
          {message}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          className="error-state__button"
          onClick={() => {
            void onAction();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}