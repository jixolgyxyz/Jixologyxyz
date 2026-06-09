import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import type { EmailVerificationCallbackCardProps } from '@/features/verification/types/verification.types';
import './EmailVerificationCallbackCard.css';

function getStatusClassName(
  status: EmailVerificationCallbackCardProps['status']
): string {
  return `email-verification-callback-card email-verification-callback-card--${status}`;
}

function getIcon(
  status: EmailVerificationCallbackCardProps['status']
): ReactNode {
  if (status === 'success') {
    return <CheckCircleIcon className="email-verification-callback-card__icon-svg" />;
  }

  if (status === 'error') {
    return <ExclamationTriangleIcon className="email-verification-callback-card__icon-svg" />;
  }

  return (
    <span
      className="email-verification-callback-card__spinner"
      aria-hidden="true"
    />
  );
}

export default function EmailVerificationCallbackCard({
  status,
  title,
  description,
  email,
  isRedirecting,
  onGoToLogin,
}: EmailVerificationCallbackCardProps) {
  const showAction = status !== 'loading';

  return (
    <section
      className={getStatusClassName(status)}
      aria-labelledby="email-verification-callback-title"
      role={status === 'error' ? 'alert' : 'status'}
    >
      <header className="email-verification-callback-card__header">
        <div className="email-verification-callback-card__icon" aria-hidden="true">
          {getIcon(status)}
        </div>

        <h1
          id="email-verification-callback-title"
          className="email-verification-callback-card__title"
        >
          {title}
        </h1>

        <p className="email-verification-callback-card__description">
          {description}
        </p>
      </header>

      {email ? (
        <div className="email-verification-callback-card__section">
          <span className="email-verification-callback-card__label">
            Correo asociado
          </span>

          <div className="email-verification-callback-card__email-box">
            <strong className="email-verification-callback-card__email-value">
              {email}
            </strong>
          </div>
        </div>
      ) : null}

      {showAction ? (
        <footer className="email-verification-callback-card__actions">
          <button
            type="button"
            className="email-verification-callback-card__button"
            onClick={onGoToLogin}
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <span
                  className="email-verification-callback-card__button-spinner"
                  aria-hidden="true"
                />
                <span className="email-verification-callback-card__button-text">
                  Redirigiendo...
                </span>
              </>
            ) : (
              <>
                <span className="email-verification-callback-card__button-text">
                  Ir a inicio de sesión
                </span>
                <ArrowRightIcon
                  className="email-verification-callback-card__button-icon"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </footer>
      ) : null}
    </section>
  );
}