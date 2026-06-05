import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { env } from '@/core/config/env';
import { supabase } from '@/core/supabase/supabase.client';
import type { SignInPayload, SignInResult } from '@/features/auth/types/auth.types';
import { normalizeEmail } from '@/features/auth/utils/auth.utils';
import { isEmailNotConfirmedMessage } from '@/features/verification/services/verification.service';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas.';
const EMAIL_VERIFICATION_CONFIG_MISMATCH_MESSAGE = 'Supabase exige verificar el correo, pero esta aplicación tiene la verificación deshabilitada. Revisa que EMAIL_VERIFICATION_ENABLED y VITE_EMAIL_VERIFICATION_ENABLED tengan valores consistentes.';

export async function signInWithPasswordService(
  payload: SignInPayload
): Promise<SignInResult> {
  const normalizedEmail = normalizeEmail(payload.email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: payload.password,
  });

  if (error) {
    if (isEmailNotConfirmedMessage(error.message)) {
      if (!env.emailVerificationEnabled) {
        throw new Error(EMAIL_VERIFICATION_CONFIG_MISMATCH_MESSAGE);
      }

      return {
        status: 'email_verification_required',
        email: normalizedEmail,
      };
    }

    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  if (!data.session || !data.user) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  if (env.emailVerificationEnabled && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();

    return {
      status: 'email_verification_required',
      email: data.user.email ?? normalizedEmail,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuario')
    .select('id, activo')
    .eq('auth_id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.activo !== true) {
    await supabase.auth.signOut();
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  return {
    status: 'authenticated',
    session: data.session,
    user: data.user,
  };
}

export async function getSessionService(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function onAuthStateChangeService(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return subscription;
}

export async function resetPasswordService(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(email),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOutService(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}