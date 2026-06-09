import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { env } from '@/core/config/env';
import { confirmEmailVerificationCallback, getDisabledEmailVerificationRedirectPath, getPendingVerificationEmail } from '@/features/verification/services/verification.service';
import type { EmailVerificationCallbackState } from '@/features/verification/types/verification.types';

const SUCCESS_REDIRECT_DELAY_MS = 5500;

const INITIAL_STATE: EmailVerificationCallbackState = {
  status: 'loading',
  title: 'Validando confirmación',
  description: 'Estamos confirmando tu correo electrónico. Esto tomará unos segundos.',
  email: getPendingVerificationEmail(),
};

export function useEmailVerificationCallbackScreen() {
  const navigate = useNavigate();
  const redirectTimeoutRef = useRef<number | null>(null);
  const [state, setState] = useState<EmailVerificationCallbackState>(INITIAL_STATE);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const clearRedirectTimeout = useCallback(() => {
    if (redirectTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(redirectTimeoutRef.current);
    redirectTimeoutRef.current = null;
  }, []);

  const goToLogin = useCallback(() => {
    clearRedirectTimeout();
    setIsRedirecting(true);
    navigate('/inicio-sesion', { replace: true });
  }, [clearRedirectTimeout, navigate]);

  useEffect(() => {
    let isMounted = true;

    const validateCallback = async () => {
      if (!env.emailVerificationEnabled) {
        const redirectPath = await getDisabledEmailVerificationRedirectPath();

        if (isMounted) {
          navigate(redirectPath, { replace: true });
        }

        return;
      }

      const result = await confirmEmailVerificationCallback();

      if (!isMounted) {
        return;
      }

      setState(result);

      if (result.status === 'success') {
        redirectTimeoutRef.current = window.setTimeout(() => {
          if (!isMounted) {
            return;
          }

          setIsRedirecting(true);
          navigate('/inicio-sesion', { replace: true });
        }, SUCCESS_REDIRECT_DELAY_MS);
      }
    };

    void validateCallback();

    return () => {
      isMounted = false;
      clearRedirectTimeout();
    };
  }, [clearRedirectTimeout, navigate]);

  return {
    state,
    isRedirecting,
    goToLogin,
  };
}