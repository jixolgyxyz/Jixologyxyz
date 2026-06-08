import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  resetPasswordService,
  signInWithPasswordService,
} from '@/features/auth/services/auth.service';
import {
  getErrorMessage,
  normalizeEmail,
} from '@/features/auth/utils/auth.utils';
import { storePendingVerificationEmail } from '@/features/verification/services/verification.service';

export function useLogInPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const result = await signInWithPasswordService({
        email,
        password,
      });

      if (result.status === 'email_verification_required') {
        storePendingVerificationEmail(result.email);
        navigate('/correo-verificacion', { replace: true });
        return;
      }

      if (!result.session?.access_token) {
        throw new Error('No se recibió un token válido.');
      }

      setInfo('Inicio de sesión exitoso.');
      navigate('/perfil', { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(err, 'Ocurrió un error al iniciar sesión.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');

    if (!normalizeEmail(email)) {
      setError(
        'Primero ingresa tu correo electrónico para recuperar la contraseña.'
      );
      return;
    }

    try {
      await resetPasswordService(email);
      setInfo('Se envió el correo de recuperación.');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el correo.'));
    }
  };

  return {
    showPassword,
    setShowPassword,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    info,
    handleLogin,
    handleForgotPassword,
  };
}