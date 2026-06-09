import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type User,
} from '@supabase/supabase-js';
import { supabase } from '@/core/supabase/supabase.client';
import type {
  EmailVerificationCallbackState,
  ResendVerificationEmailResult,
  VerificationSessionInfo,
} from '@/features/verification/types/verification.types';

type ResendVerificationEmailFunctionResponse = {
  status?: ResendVerificationEmailResult['status'];
  message?: string;
  error?: string;
  cooldownSeconds?: number;
  cooldown_seconds?: number;
};

type CallbackSessionTokens = {
  access_token: string;
  refresh_token: string;
};

const CALLBACK_LOADING_STATE: EmailVerificationCallbackState = {
  status: 'loading',
  title: 'Validando confirmación',
  description: 'Estamos confirmando tu correo electrónico. Esto tomará unos segundos.',
  email: null,
};

function getSafeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeStoredEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringProperty(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getNumberProperty(
  source: Record<string, unknown>,
  key: string
): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isResendVerificationEmailStatus(
  status: unknown
): status is ResendVerificationEmailResult['status'] {
  return status === 'success' || status === 'error' || status === 'cooldown';
}

function parseResendVerificationResponse(
  data: unknown,
  fallbackMessage: string
): ResendVerificationEmailResult {
  if (!isRecord(data)) {
    return {
      status: 'error',
      message: fallbackMessage,
    };
  }

  const status = data.status;
  const message =
    getStringProperty(data, 'message') ??
    getStringProperty(data, 'error') ??
    fallbackMessage;
  const cooldownSeconds =
    getNumberProperty(data, 'cooldownSeconds') ??
    getNumberProperty(data, 'cooldown_seconds');

  if (isResendVerificationEmailStatus(status)) {
    return {
      status,
      message,
      cooldownSeconds,
    };
  }

  if (typeof cooldownSeconds === 'number' && cooldownSeconds > 0) {
    return {
      status: 'cooldown',
      message,
      cooldownSeconds,
    };
  }

  return {
    status: 'error',
    message,
  };
}

async function parseFunctionHttpError(
  error: FunctionsHttpError
): Promise<ResendVerificationEmailResult> {
  try {
    const body = (await error.context.json()) as unknown;

    return parseResendVerificationResponse(
      body,
      'La función de reenvío devolvió un error.'
    );
  } catch {
    return {
      status: 'error',
      message: 'La función de reenvío devolvió un error HTTP sin cuerpo JSON.',
    };
  }
}

function getCallbackParams(): {
  searchParams: URLSearchParams;
  hashParams: URLSearchParams;
} {
  if (typeof window === 'undefined') {
    return {
      searchParams: new URLSearchParams(),
      hashParams: new URLSearchParams(),
    };
  }

  return {
    searchParams: new URLSearchParams(window.location.search),
    hashParams: new URLSearchParams(window.location.hash.replace(/^#/, '')),
  };
}

function getCallbackUrlError(): string | null {
  const { searchParams, hashParams } = getCallbackParams();

  return (
    searchParams.get('error_description') ??
    hashParams.get('error_description') ??
    searchParams.get('error') ??
    hashParams.get('error') ??
    searchParams.get('error_code') ??
    hashParams.get('error_code')
  );
}

function getCallbackCode(): string | null {
  const { searchParams } = getCallbackParams();
  return searchParams.get('code');
}

function getCallbackSessionTokens(): CallbackSessionTokens | null {
  const { hashParams } = getCallbackParams();
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function isUserEmailVerified(user: User | null): boolean {
  return Boolean(user?.email_confirmed_at);
}

function buildCallbackErrorState(message?: string): EmailVerificationCallbackState {
  return {
    status: 'error',
    title: 'No se pudo verificar el correo',
    description:
      message ??
      'El enlace de verificación es inválido, expiró o ya fue utilizado. Solicita un nuevo correo de verificación e inténtalo otra vez.',
    email: getPendingVerificationEmail(),
  };
}

function clearCallbackUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

async function getAuthenticatedCallbackUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

async function signOutCurrentSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

async function trySignOutCurrentSession(): Promise<void> {
  try {
    await signOutCurrentSession();
  } catch (error) {
    console.warn('No se pudo cerrar la sesión después de verificar el correo.', error);
  }
}

export function storePendingVerificationEmail(email: string): void {
  const normalizedEmail = normalizeStoredEmail(email);

  if (!normalizedEmail) {
    return;
  }

  getSafeSessionStorage()?.setItem(
    'pending_verification_email',
    normalizedEmail
  );
}

export function getPendingVerificationEmail(): string | null {
  const value = getSafeSessionStorage()?.getItem(
    'pending_verification_email'
  );

  if (!value) {
    return null;
  }

  const normalizedEmail = normalizeStoredEmail(value);
  return normalizedEmail || null;
}

export function clearPendingVerificationEmail(): void {
  getSafeSessionStorage()?.removeItem('pending_verification_email');
}

export async function getDisabledEmailVerificationRedirectPath(): Promise<'/perfil' | '/inicio-sesion'> {
  clearPendingVerificationEmail();

  const { data: { session }, error } = await supabase.auth.getSession();

  return !error && session ? '/perfil' : '/inicio-sesion';
}

export function isEmailNotConfirmedMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('email not confirmed') ||
    normalizedMessage.includes('not confirmed')
  );
}

export async function getVerificationSessionInfo(): Promise<VerificationSessionInfo> {
  const pendingEmail = getPendingVerificationEmail();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return {
      email: pendingEmail,
      isVerified: false,
    };
  }

  let sessionUser = session?.user ?? null;

  if (session) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      sessionUser = user;
    }
  }

  return {
    email: pendingEmail ?? sessionUser?.email ?? null,
    isVerified: isUserEmailVerified(sessionUser),
  };
}

export async function resendVerificationEmail(): Promise<ResendVerificationEmailResult> {
  const email = getPendingVerificationEmail();

  if (!email) {
    return {
      status: 'error',
      message:
        'No encontramos un correo pendiente de verificación. Vuelve a iniciar sesión para continuar.',
    };
  }

  const { data, error } =
    await supabase.functions.invoke<ResendVerificationEmailFunctionResponse>(
      'resend_verification_email',
      {
        body: { email },
      }
    );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      return parseFunctionHttpError(error);
    }

    if (error instanceof FunctionsRelayError) {
      return {
        status: 'error',
        message: `Relay error: ${error.message}`,
      };
    }

    if (error instanceof FunctionsFetchError) {
      return {
        status: 'error',
        message: `Fetch error: ${error.message}`,
      };
    }

    return {
      status: 'error',
      message: error.message || 'No se pudo reenviar el correo de verificación.',
    };
  }

  return parseResendVerificationResponse(
    data,
    'La función de reenvío no devolvió una respuesta válida.'
  );
}

export async function exitVerificationFlow(): Promise<void> {
  clearPendingVerificationEmail();
  await signOutCurrentSession();
}

export async function confirmEmailVerificationCallback(): Promise<EmailVerificationCallbackState> {
  const pendingEmail = getPendingVerificationEmail();
  const callbackError = getCallbackUrlError();

  if (callbackError) {
    clearCallbackUrl();
    return buildCallbackErrorState(callbackError);
  }

  const code = getCallbackCode();
  const tokens = getCallbackSessionTokens();
  let callbackUser: User | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      clearCallbackUrl();
      return buildCallbackErrorState(error.message);
    }

    callbackUser = data.user ?? data.session?.user ?? null;
  } else if (tokens) {
    const { data, error } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    if (error) {
      clearCallbackUrl();
      return buildCallbackErrorState(error.message);
    }

    callbackUser = data.user ?? data.session?.user ?? null;
  }

  callbackUser = callbackUser ?? (await getAuthenticatedCallbackUser());
  clearCallbackUrl();

  if (!isUserEmailVerified(callbackUser)) {
    return buildCallbackErrorState(
      'No pudimos confirmar que el correo ya esté verificado. Solicita un nuevo enlace e inténtalo otra vez.'
    );
  }

  const verifiedEmail = callbackUser?.email ?? pendingEmail;

  clearPendingVerificationEmail();
  await trySignOutCurrentSession();

  return {
    ...CALLBACK_LOADING_STATE,
    status: 'success',
    title: 'Correo verificado correctamente',
    description:
      'Tu correo quedó confirmado. Ya puedes volver al inicio de sesión y entrar con tus credenciales.',
    email: verifiedEmail,
  };
}