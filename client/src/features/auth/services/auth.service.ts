import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/core/supabase/supabase.client';
import type { SignInPayload, SignInResult } from '@/features/auth/types/auth.types';
import { normalizeEmail } from '@/features/auth/utils/auth.utils';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas.';

export async function signInWithPasswordService(
  payload: SignInPayload
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(payload.email),
    password: payload.password,
  });

  if (error || !data.session || !data.user) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
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