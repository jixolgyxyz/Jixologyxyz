import { EnvelopeIcon } from '@heroicons/react/24/outline';
import type { EmailVerificationCardProps } from '@/features/verification/types/verification.types';
import './EmailVerificationCard.css';

function getFeedbackClassName(status: EmailVerificationCardProps['feedback']['status']): string {
  if (status === 'success') {
    return 'email-verification-card__feedback email-verification-card__feedback--success';
  }

  if (status === 'error') {
    return 'email-verification-card__feedback email-verification-card__feedback--error';
  }

  if (status === 'cooldown') {
    return 'email-verification-card__feedback email-verification-card__feedback--cooldown';
  }

  return 'email-verification-card__feedback';
}

function getFeedbackEyebrow(status: EmailVerificationCardProps['feedback']['status']): string {
  if (status === 'success') {
    return 'Solicitud exitosa';
  }

  if (status === 'error') {
    return 'Ocurrió un problema';
  }

  if (status === 'cooldown') {
    return 'Espera antes de reenviar';
  }

  return '';
}

export default function EmailVerificationCard({
  email,
  feedback,
  isResending,
  isExiting,
  canResend,
  onResend,
  onExit,
}: EmailVerificationCardProps) {
  return (
    <section
      className="email-verification-card"
      aria-labelledby="email-verification-title"
    >
      <header className="email-verification-card__header">
        <div className="email-verification-card__icon" aria-hidden="true">
          <EnvelopeIcon className="email-verification-card__icon-svg" />
        </div>

        <h1 id="email-verification-title" className="email-verification-card__title">
          Verifica tu correo electrónico
        </h1>

        <p className="email-verification-card__description">
          Tu cuenta está pendiente de verificación. Para continuar, confirma tu
          correo electrónico desde el enlace que te enviamos.
        </p>
      </header>

      <div className="email-verification-card__section">
        <span className="email-verification-card__label">Correo asociado</span>

        <div className="email-verification-card__email-box">
          <strong className="email-verification-card__email-value">
            {email ?? 'Correo no disponible'}
          </strong>
        </div>
      </div>

      <div className="email-verification-card__section">
        <span className="email-verification-card__label">Qué debes hacer</span>

        <ul className="email-verification-card__instruction-list">
          <li className="email-verification-card__instruction-item">
            Revisa tu bandeja de entrada.
          </li>
          <li className="email-verification-card__instruction-item">
            Busca también en spam o correos no deseados.
          </li>
          <li className="email-verification-card__instruction-item">
            Si no recibiste el mensaje, solicita un nuevo envío.
          </li>
        </ul>
      </div>

      {feedback.status !== 'idle' ? (
        <div
          className={getFeedbackClassName(feedback.status)}
          role="status"
        >
          <span className="email-verification-card__feedback-eyebrow">
            {getFeedbackEyebrow(feedback.status)}
          </span>

          <h2 className="email-verification-card__feedback-title">
            {feedback.title}
          </h2>

          <p className="email-verification-card__feedback-description">
            {feedback.description}
          </p>

          {feedback.status === 'cooldown' &&
          typeof feedback.cooldownSeconds === 'number' ? (
            <p className="email-verification-card__feedback-time">
              Disponible nuevamente en <strong>{feedback.cooldownSeconds}s</strong>.
            </p>
          ) : null}
        </div>
      ) : null}

      <footer className="email-verification-card__actions">
        <button
          type="button"
          className="email-verification-card__button email-verification-card__button--primary"
          onClick={() => {
            void onResend();
          }}
          disabled={!canResend || isExiting}
        >
          {isResending ? (
            <>
              <span
                className="email-verification-card__button-spinner"
                aria-hidden="true"
              />
              <span className="email-verification-card__button-text">Reenviando...</span>
            </>
          ) : (
            <span className="email-verification-card__button-text">Reenviar correo</span>
          )}
        </button>

        <button
          type="button"
          className="email-verification-card__button email-verification-card__button--secondary"
          onClick={() => {
            void onExit();
          }}
          disabled={isExiting || isResending}
        >
          {isExiting ? (
            <>
              <span
                className="email-verification-card__button-spinner email-verification-card__button-spinner--secondary"
                aria-hidden="true"
              />
              <span className="email-verification-card__button-text">Saliendo...</span>
            </>
          ) : (
            <span className="email-verification-card__button-text">Cerrar sesión</span>
          )}
        </button>
      </footer>
    </section>
  );
}