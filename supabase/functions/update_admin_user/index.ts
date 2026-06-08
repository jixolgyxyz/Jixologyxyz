import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  createClient,
  type SupabaseClient,
  type User,
} from 'npm:@supabase/supabase-js@2.100.0';
import { getBooleanEnv } from '../_shared/env.ts';

const verificationEmailTemplate = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verifica tu correo electrónico</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6f2ea;
        color: #29251d;
        font-family: Arial, Helvetica, sans-serif;
      }

      table {
        border-collapse: collapse;
      }

      .email-wrapper {
        width: 100%;
        background: #f6f2ea;
        padding: 32px 16px;
      }

      .email-card {
        width: 100%;
        max-width: 560px;
        background: #ffffff;
        border: 1px solid #e5dfd3;
        border-radius: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .email-card__content {
        padding: 48px 40px;
      }

      .email-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #fdecef;
        color: #e31837;
        font-size: 30px;
        line-height: 64px;
        text-align: center;
        margin: 0 auto 20px;
      }

      .email-title {
        margin: 0 0 16px;
        color: #0a0838;
        font-size: 30px;
        line-height: 1.15;
        font-weight: 700;
        text-align: center;
      }

      .email-text {
        margin: 0 0 24px;
        color: #29251d;
        font-size: 16px;
        line-height: 1.6;
        text-align: center;
      }

      .email-button {
        display: inline-block;
        min-width: 184px;
        padding: 14px 24px;
        border-radius: 999px;
        background: #e31837;
        color: #ffffff !important;
        font-size: 16px;
        line-height: 1;
        font-weight: 700;
        text-align: center;
        text-decoration: none;
      }

      .email-link-box {
        margin-top: 28px;
        padding: 16px;
        border: 1px solid #e5dfd3;
        border-radius: 16px;
        background: #fbfaf8;
      }

      .email-link-label {
        margin: 0 0 8px;
        color: #4a453d;
        font-size: 13px;
        line-height: 1.5;
      }

      .email-link {
        color: #0a0838;
        font-size: 13px;
        line-height: 1.5;
        word-break: break-all;
      }

      .email-footer {
        margin: 28px 0 0;
        color: #4a453d;
        font-size: 13px;
        line-height: 1.6;
        text-align: center;
      }

      @media screen and (max-width: 480px) {
        .email-card__content {
          padding: 36px 24px;
        }

        .email-title {
          font-size: 26px;
        }
      }
    </style>
  </head>
  <body>
    <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="email-card__content">
                <div class="email-icon" aria-hidden="true">&#9993;</div>

                <h1 class="email-title">Verifica tu correo electrónico</h1>

                <p class="email-text">
                  Un administrador creó o actualizó una cuenta para ti. Para
                  activar el acceso, confirma tu correo electrónico.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a class="email-button" href="{{ .ConfirmationURL }}">Verificar correo</a>
                    </td>
                  </tr>
                </table>

                <div class="email-link-box">
                  <p class="email-link-label">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>
                  <a class="email-link" href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
                </div>

                <p class="email-footer">
                  Si no esperabas este mensaje, puedes ignorarlo o contactar al
                  administrador.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

interface UpdateAdminUserPayload {
  id: number;
  auth_id: string;
  email: string;
  password?: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
  id_rol_global: number | null;
  original_email?: string;
}

type PublicProfileSnapshot = {
  id: number;
  auth_id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
  id_rol_global: number | null;
};

type AuthUpdateAttributes = {
  email?: string;
  password?: string;
  email_confirm?: boolean;
};

type RollbackResult = {
  success: boolean;
  authRestored: boolean;
  profileRestored: boolean;
  errors: string[];
  authId: string;
  userId: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class FunctionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'FunctionError';
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmailVerified(user: User): boolean {
  return Boolean(user.email_confirmed_at);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringProperty(
  value: unknown,
  property: string,
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const propertyValue = value[property];
  return typeof propertyValue === 'string' ? propertyValue : null;
}

function getErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado.',
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return (
    getStringProperty(error, 'message') ??
    getStringProperty(error, 'error_description') ??
    getStringProperty(error, 'error') ??
    fallback
  );
}

function getErrorCode(error: unknown): string | null {
  return (
    getStringProperty(error, 'code') ??
    getStringProperty(error, 'error_code')
  );
}

function isEmailAlreadyInUseError(error: unknown): boolean {
  const code = getErrorCode(error)?.toLowerCase() ?? '';
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('email address is already') ||
    message.includes('duplicate key')
  );
}

function logStructuredError(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(JSON.stringify({
    event,
    ...context,
  }));
}

function requireNullableString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  if (!(key in body)) {
    throw new FunctionError(
      400,
      'invalid_payload',
      `Falta el campo ${key}.`,
    );
  }

  const value = body[key];
  if (value !== null && typeof value !== 'string') {
    throw new FunctionError(
      400,
      'invalid_payload',
      `El campo ${key} debe ser texto o null.`,
    );
  }

  return value;
}

function requireNullableNumber(
  body: Record<string, unknown>,
  key: string,
): number | null {
  if (!(key in body)) {
    throw new FunctionError(
      400,
      'invalid_payload',
      `Falta el campo ${key}.`,
    );
  }

  const value = body[key];
  if (
    value !== null &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new FunctionError(
      400,
      'invalid_payload',
      `El campo ${key} debe ser numérico o null.`,
    );
  }

  return value;
}

function parsePayload(body: unknown): UpdateAdminUserPayload {
  if (!isRecord(body)) {
    throw new FunctionError(
      400,
      'invalid_payload',
      'El cuerpo de la solicitud debe ser un objeto JSON.',
    );
  }

  const id = body.id;
  const authId = body.auth_id;
  const email = body.email;
  const password = body.password;
  const originalEmail = body.original_email;

  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new FunctionError(400, 'invalid_payload', 'El id no es válido.');
  }

  if (typeof authId !== 'string' || !UUID_PATTERN.test(authId)) {
    throw new FunctionError(
      400,
      'invalid_payload',
      'El auth_id no es válido.',
    );
  }

  if (
    typeof email !== 'string' ||
    !EMAIL_PATTERN.test(normalizeEmail(email)) ||
    normalizeEmail(email).length > 320
  ) {
    throw new FunctionError(
      400,
      'invalid_payload',
      'El correo no tiene un formato válido.',
    );
  }

  if (password !== undefined && typeof password !== 'string') {
    throw new FunctionError(
      400,
      'invalid_payload',
      'La contraseña debe ser texto.',
    );
  }

  if (originalEmail !== undefined && typeof originalEmail !== 'string') {
    throw new FunctionError(
      400,
      'invalid_payload',
      'El correo original debe ser texto.',
    );
  }

  return {
    id,
    auth_id: authId,
    email,
    password,
    nombre: requireNullableString(body, 'nombre'),
    apellido: requireNullableString(body, 'apellido'),
    telefono: requireNullableString(body, 'telefono'),
    fecha_nacimiento: requireNullableString(body, 'fecha_nacimiento'),
    sobre_mi: requireNullableString(body, 'sobre_mi'),
    jornada: requireNullableNumber(body, 'jornada'),
    id_zona_horaria: requireNullableNumber(body, 'id_zona_horaria'),
    id_rol_global: requireNullableNumber(body, 'id_rol_global'),
    original_email: originalEmail,
  };
}

function getProfileUpdateValues(
  payload: UpdateAdminUserPayload,
  email: string,
): Omit<PublicProfileSnapshot, 'id' | 'auth_id'> {
  return {
    email,
    nombre: payload.nombre,
    apellido: payload.apellido,
    telefono: payload.telefono,
    fecha_nacimiento: payload.fecha_nacimiento,
    sobre_mi: payload.sobre_mi,
    jornada: payload.jornada,
    id_zona_horaria: payload.id_zona_horaria,
    id_rol_global: payload.id_rol_global,
  };
}

function getSnapshotUpdateValues(
  snapshot: PublicProfileSnapshot,
): Omit<PublicProfileSnapshot, 'id' | 'auth_id'> {
  return {
    email: snapshot.email,
    nombre: snapshot.nombre,
    apellido: snapshot.apellido,
    telefono: snapshot.telefono,
    fecha_nacimiento: snapshot.fecha_nacimiento,
    sobre_mi: snapshot.sobre_mi,
    jornada: snapshot.jornada,
    id_zona_horaria: snapshot.id_zona_horaria,
    id_rol_global: snapshot.id_rol_global,
  };
}

function buildVerificationRedirectUrl(appUrl: string): string {
  const baseUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

  try {
    return new URL(
      'correo-verificacion/redireccion',
      baseUrl,
    ).toString();
  } catch {
    throw new FunctionError(
      500,
      'invalid_app_url',
      'APP_URL no contiene una URL válida.',
    );
  }
}

function renderVerificationEmail(params: {
  confirmationUrl: string;
  currentEmail: string;
  newEmail: string;
  appUrl: string;
  nombre: string | null;
}) {
  return verificationEmailTemplate
    .replaceAll('{{ .ConfirmationURL }}', params.confirmationUrl)
    .replaceAll('{{ .Email }}', params.currentEmail)
    .replaceAll('{{ .NewEmail }}', params.newEmail)
    .replaceAll('{{ .SiteURL }}', params.appUrl)
    .replaceAll('{{ .Nombre }}', params.nombre ?? '');
}

async function sendVerificationEmail(params: {
  to: string;
  html: string;
}): Promise<void> {
  const resendApiKey = Deno.env.get('SMTP_PASS');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

  if (!resendApiKey || !resendFromEmail) {
    throw new Error(
      'Faltan los secretos SMTP_PASS o RESEND_FROM_EMAIL.'
    );
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [params.to],
      subject: 'Verifica tu nuevo correo electrónico',
      html: params.html,
    }),
  });

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getStringProperty(result, 'message') ??
      getStringProperty(result, 'error') ??
      'No se pudo enviar el correo de verificación.'
    );
  }
}

async function getAuthUser(
  supabaseAdmin: SupabaseClient,
  authId: string,
): Promise<User> {
  const { data, error } =
    await supabaseAdmin.auth.admin.getUserById(authId);

  if (error || !data.user) {
    throw new FunctionError(
      400,
      'auth_user_not_found',
      error?.message || 'No se encontró el usuario en Auth.',
    );
  }

  return data.user;
}

async function updateAuthUser(
  supabaseAdmin: SupabaseClient,
  authId: string,
  attributes: AuthUpdateAttributes,
  errorCode: string,
): Promise<User> {
  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(authId, attributes);

  if (error || !data.user) {
    if (isEmailAlreadyInUseError(error)) {
      throw new FunctionError(
        409,
        'email_already_in_use',
        'El correo ya pertenece a otro usuario.',
      );
    }

    throw new FunctionError(
      400,
      errorCode,
      error?.message || 'No se pudo actualizar el usuario en Auth.',
    );
  }

  return data.user;
}

async function prepareEmailReverification(
  supabaseAdmin: SupabaseClient,
  authId: string,
  expectedEmail: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc(
    'admin_prepare_email_reverification',
    {
      p_auth_id: authId,
      p_expected_email: expectedEmail,
    },
  );

  if (error) {
    throw new FunctionError(
      500,
      'email_unconfirm_failed',
      error.message ||
        'No se pudo dejar el correo pendiente de verificación.',
    );
  }
}

async function generateSignupVerificationLink(
  supabaseAdmin: SupabaseClient,
  params: {
    authId: string;
    email: string;
    redirectTo: string;
  },
): Promise<string> {
  const placeholderPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: params.email,
    password: placeholderPassword,
    options: {
      redirectTo: params.redirectTo,
    },
  });

  if (error) {
    throw new FunctionError(
      500,
      'verification_link_generation_failed',
      error.message || 'No se pudo generar el enlace de verificación.',
    );
  }

  if (!data.user || data.user.id !== params.authId) {
    logStructuredError('verification_link_wrong_user', {
      targetAuthId: params.authId,
      generatedAuthId: data.user?.id ?? null,
    });

    throw new FunctionError(
      500,
      'verification_link_wrong_user',
      'Supabase no generó el enlace para el usuario esperado.',
    );
  }

  const actionLink = data.properties?.action_link;
  if (
    !actionLink ||
    data.properties?.verification_type !== 'signup'
  ) {
    throw new FunctionError(
      500,
      'verification_link_generation_failed',
      'Supabase no generó un enlace signup válido.',
    );
  }

  return actionLink;
}

async function updatePublicProfile(
  supabaseAdmin: SupabaseClient,
  payload: UpdateAdminUserPayload,
  normalizedEmail: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('usuario')
    .update(getProfileUpdateValues(payload, normalizedEmail))
    .eq('id', payload.id)
    .eq('auth_id', payload.auth_id)
    .select('id, email')
    .maybeSingle<{ id: number; email: string }>();

  if (error) {
    throw new FunctionError(
      409,
      'public_profile_update_failed',
      error.message,
    );
  }

  if (!data) {
    throw new FunctionError(
      409,
      'public_profile_not_found',
      'No se encontró la fila pública correspondiente al usuario.',
    );
  }

  if (normalizeEmail(data.email) !== normalizedEmail) {
    throw new FunctionError(
      409,
      'public_profile_update_failed',
      'public.usuario no conservó el correo actualizado.',
    );
  }
}

async function restorePublicProfile(
  supabaseAdmin: SupabaseClient,
  snapshot: PublicProfileSnapshot,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from('usuario')
    .update(getSnapshotUpdateValues(snapshot))
    .eq('id', snapshot.id)
    .eq('auth_id', snapshot.auth_id)
    .select('id')
    .maybeSingle<{ id: number }>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'No se pudo restaurar public.usuario.',
    };
  }

  return { success: true };
}

async function rollbackAuthEmail(
  supabaseAdmin: SupabaseClient,
  params: {
    authId: string;
    currentEmail: string;
    previousEmail: string;
    previousEmailWasVerified: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear any link generated for the new email before restoring the old one.
    await prepareEmailReverification(
      supabaseAdmin,
      params.authId,
      params.currentEmail,
    );
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  const attributes: AuthUpdateAttributes = {
    email: params.previousEmail,
  };

  if (params.previousEmailWasVerified) {
    attributes.email_confirm = true;
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(
      params.authId,
      attributes,
    );

  if (error || !data.user) {
    return {
      success: false,
      error: error?.message || 'No se pudo restaurar el correo en Auth.',
    };
  }

  const restoredEmail = data.user.email
    ? normalizeEmail(data.user.email)
    : null;
  const restoredVerification = isEmailVerified(data.user);

  if (
    restoredEmail !== params.previousEmail ||
    restoredVerification !== params.previousEmailWasVerified
  ) {
    return {
      success: false,
      error: 'Auth no restauró completamente el estado anterior.',
    };
  }

  return { success: true };
}

async function rollbackAfterPreparationFailure(
  supabaseAdmin: SupabaseClient,
  params: {
    authId: string;
    currentEmail: string;
    previousEmail: string;
    previousEmailWasVerified: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getAuthUser(supabaseAdmin, params.authId);
    const authEmail = currentUser.email
      ? normalizeEmail(currentUser.email)
      : null;

    if (authEmail !== params.currentEmail) {
      return {
        success: false,
        error:
          'El correo cambió de nuevo durante la compensación; no se sobrescribió.',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  const attributes: AuthUpdateAttributes = {
    email: params.previousEmail,
  };

  if (params.previousEmailWasVerified) {
    attributes.email_confirm = true;
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(
      params.authId,
      attributes,
    );

  if (error || !data.user) {
    return {
      success: false,
      error: error?.message || 'No se pudo restaurar el correo en Auth.',
    };
  }

  const restoredEmail = data.user.email
    ? normalizeEmail(data.user.email)
    : null;

  if (
    restoredEmail !== params.previousEmail ||
    isEmailVerified(data.user) !== params.previousEmailWasVerified
  ) {
    return {
      success: false,
      error: 'Auth no restauró completamente el estado anterior.',
    };
  }

  return { success: true };
}

async function compensateBeforeEmailSend(
  supabaseAdmin: SupabaseClient,
  params: {
    profileSnapshot: PublicProfileSnapshot;
    profileWasUpdated: boolean;
    currentEmail: string;
    previousEmail: string;
    previousEmailWasVerified: boolean;
  },
): Promise<RollbackResult> {
  const errors: string[] = [];
  const authRollback = await rollbackAuthEmail(supabaseAdmin, {
    authId: params.profileSnapshot.auth_id,
    currentEmail: params.currentEmail,
    previousEmail: params.previousEmail,
    previousEmailWasVerified: params.previousEmailWasVerified,
  });

  if (!authRollback.success && authRollback.error) {
    errors.push(`Auth: ${authRollback.error}`);
  }

  let profileRestored = !params.profileWasUpdated;

  // If Auth could not be restored, keep an already-updated profile on the
  // current email to avoid creating a second mismatch during compensation.
  if (params.profileWasUpdated && authRollback.success) {
    const profileRollback = await restorePublicProfile(
      supabaseAdmin,
      params.profileSnapshot,
    );
    profileRestored = profileRollback.success;

    if (!profileRollback.success && profileRollback.error) {
      errors.push(`public.usuario: ${profileRollback.error}`);
    }
  }

  return {
    success: authRollback.success && profileRestored,
    authRestored: authRollback.success,
    profileRestored,
    errors,
    authId: params.profileSnapshot.auth_id,
    userId: params.profileSnapshot.id,
  };
}

async function assertFinalAuthState(
  supabaseAdmin: SupabaseClient,
  params: {
    authId: string;
    expectedEmail: string;
    expectedVerified: boolean;
  },
): Promise<void> {
  const user = await getAuthUser(supabaseAdmin, params.authId);
  const email = user.email ? normalizeEmail(user.email) : null;

  if (
    email !== params.expectedEmail ||
    isEmailVerified(user) !== params.expectedVerified
  ) {
    throw new FunctionError(
      500,
      params.expectedVerified
        ? 'auth_email_update_failed'
        : 'email_unconfirm_failed',
      'Auth no quedó en el estado de correo esperado.',
    );
  }
}

function rollbackFailedResponse(
  sourceError: FunctionError,
  rollback: RollbackResult,
): Response {
  logStructuredError('update_admin_user_rollback_failed', {
    authId: rollback.authId,
    userId: rollback.userId,
    sourceCode: sourceError.code,
    authRestored: rollback.authRestored,
    profileRestored: rollback.profileRestored,
    errors: rollback.errors,
  });

  return jsonResponse(
    {
      error:
        'La actualización falló y no fue posible restaurar completamente el estado anterior.',
      code: 'rollback_failed',
      originalCode: sourceError.code,
      authRestored: rollback.authRestored,
      publicProfileRestored: rollback.profileRestored,
    },
    500,
  );
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(
        { error: 'Missing Authorization header.' },
        401,
      );
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return jsonResponse(
        { error: 'Invalid Authorization header.' },
        401,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new FunctionError(
        500,
        'missing_supabase_configuration',
        'Faltan variables de entorno de Supabase.',
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabaseUser.auth.getUser(bearerMatch[1]);

    if (requesterError || !requester) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('usuario')
      .select('id_rol_global')
      .eq('auth_id', requester.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.id_rol_global !== 1) {
      return jsonResponse(
        { error: 'Solo un administrador puede actualizar usuarios.' },
        403,
      );
    }

    let requestBody: unknown;

    try {
      requestBody = await req.json();
    } catch {
      throw new FunctionError(
        400,
        'invalid_payload',
        'El cuerpo de la solicitud debe ser JSON válido.',
      );
    }

    const body = parsePayload(requestBody);

    const { data: targetProfile, error: targetProfileError } =
      await supabaseAdmin
        .from('usuario')
        .select(
          'id, auth_id, email, nombre, apellido, telefono, fecha_nacimiento, sobre_mi, jornada, id_zona_horaria, id_rol_global',
        )
        .eq('id', body.id)
        .eq('auth_id', body.auth_id)
        .maybeSingle<PublicProfileSnapshot>();

    if (targetProfileError) {
      return jsonResponse(
        {
          error: targetProfileError.message,
          code: 'public_profile_lookup_failed',
        },
        400,
      );
    }

    if (!targetProfile) {
      return jsonResponse(
        {
          error: 'El id y auth_id no corresponden al mismo usuario.',
          code: 'public_profile_not_found',
        },
        409,
      );
    }

    const currentAuthUser = await getAuthUser(
      supabaseAdmin,
      body.auth_id,
    );

    const currentEmail =
      currentAuthUser.email?.trim().toLowerCase() ?? null;

    if (!currentEmail) {
      return jsonResponse(
        {
          error: 'El usuario no tiene correo registrado en Auth.',
          code: 'auth_email_missing',
        },
        409,
      );
    }

    if (
      body.original_email !== undefined &&
      normalizeEmail(body.original_email) !== currentEmail
    ) {
      return jsonResponse(
        {
          error:
            'El correo del usuario cambió desde que se abrió el formulario.',
          code: 'stale_original_email',
        },
        409,
      );
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const emailChanged = currentEmail !== normalizedEmail;
    const emailVerificationEnabled = getBooleanEnv('EMAIL_VERIFICATION_ENABLED', true);
    const password = body.password?.trim() || null;

    if (emailChanged) {
      const { data: duplicateProfile, error: duplicateProfileError } =
        await supabaseAdmin
          .from('usuario')
          .select('id')
          .eq('email', normalizedEmail)
          .neq('id', body.id)
          .limit(1)
          .maybeSingle<{ id: number }>();

      if (duplicateProfileError) {
        throw new FunctionError(
          500,
          'email_uniqueness_check_failed',
          duplicateProfileError.message,
        );
      }

      if (duplicateProfile) {
        return jsonResponse(
          {
            error: 'El correo ya pertenece a otro usuario.',
            code: 'email_already_in_use',
          },
          409,
        );
      }
    }

    if (!emailChanged) {
      await updatePublicProfile(supabaseAdmin, body, normalizedEmail);

      if (password) {
        try {
          await updateAuthUser(
            supabaseAdmin,
            body.auth_id,
            { password },
            'auth_password_update_failed',
          );
        } catch (error) {
          const profileRollback = await restorePublicProfile(
            supabaseAdmin,
            targetProfile,
          );

          if (!profileRollback.success) {
            logStructuredError('password_update_profile_rollback_failed', {
              authId: body.auth_id,
              userId: body.id,
              error: profileRollback.error,
            });

            return jsonResponse(
              {
                error:
                  'La contraseña no pudo actualizarse y tampoco fue posible restaurar el perfil.',
                code: 'rollback_failed',
                originalCode: error instanceof FunctionError
                  ? error.code
                  : 'auth_password_update_failed',
              },
              500,
            );
          }

          throw error;
        }
      }

      return jsonResponse({
        message: 'Usuario actualizado correctamente.',
      });
    }

    const previousEmailWasVerified = isEmailVerified(currentAuthUser);
    const authAttributes: AuthUpdateAttributes = {
      email: normalizedEmail,
    };

    if (!emailVerificationEnabled) {
      authAttributes.email_confirm = true;
    }

    try {
      await updateAuthUser(
        supabaseAdmin,
        body.auth_id,
        authAttributes,
        'auth_email_update_failed',
      );
    } catch (error) {
      if (error instanceof FunctionError) {
        return jsonResponse(
          {
            error: error.message,
            code: error.code,
          },
          error.status,
        );
      }

      throw error;
    }

    let confirmationUrl: string | null = null;
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

    if (emailVerificationEnabled) {
      try {
        await prepareEmailReverification(
          supabaseAdmin,
          body.auth_id,
          normalizedEmail,
        );
      } catch (error) {
        const sourceError = error instanceof FunctionError
          ? error
          : new FunctionError(
            500,
            'email_unconfirm_failed',
            getErrorMessage(error),
          );
        const authRollback = await rollbackAfterPreparationFailure(
          supabaseAdmin,
          {
            authId: body.auth_id,
            currentEmail: normalizedEmail,
            previousEmail: currentEmail,
            previousEmailWasVerified,
          },
        );

        if (!authRollback.success) {
          logStructuredError('email_unconfirm_rollback_failed', {
            authId: body.auth_id,
            userId: body.id,
            sourceCode: sourceError.code,
            error: authRollback.error,
          });

          return jsonResponse(
            {
              error:
                'Auth cambió el correo, pero no pudo dejarlo pendiente ni restaurar el correo anterior.',
              code: 'rollback_failed',
              originalCode: sourceError.code,
              authRestored: false,
              publicProfileRestored: true,
            },
            500,
          );
        }

        return jsonResponse(
          {
            error: sourceError.message,
            code: sourceError.code,
            authRestored: true,
            publicProfileRestored: true,
          },
          sourceError.status,
        );
      }

      try {
        confirmationUrl = await generateSignupVerificationLink(
          supabaseAdmin,
          {
            authId: body.auth_id,
            email: normalizedEmail,
            redirectTo: buildVerificationRedirectUrl(appUrl),
          },
        );
      } catch (error) {
        const sourceError = error instanceof FunctionError
          ? error
          : new FunctionError(
            500,
            'verification_link_generation_failed',
            getErrorMessage(error),
          );
        const rollback = await compensateBeforeEmailSend(
          supabaseAdmin,
          {
            profileSnapshot: targetProfile,
            profileWasUpdated: false,
            currentEmail: normalizedEmail,
            previousEmail: currentEmail,
            previousEmailWasVerified,
          },
        );

        if (!rollback.success) {
          return rollbackFailedResponse(sourceError, rollback);
        }

        return jsonResponse(
          {
            error: sourceError.message,
            code: sourceError.code,
            authRestored: true,
            publicProfileRestored: true,
          },
          sourceError.status,
        );
      }
    }

    if (emailVerificationEnabled && !confirmationUrl) {
      const sourceError = new FunctionError(
        500,
        'verification_link_generation_failed',
        'No existe un enlace de verificación para enviar.',
      );
      const rollback = await compensateBeforeEmailSend(
        supabaseAdmin,
        {
          profileSnapshot: targetProfile,
          profileWasUpdated: false,
          currentEmail: normalizedEmail,
          previousEmail: currentEmail,
          previousEmailWasVerified,
        },
      );

      if (!rollback.success) {
        return rollbackFailedResponse(sourceError, rollback);
      }

      return jsonResponse(
        {
          error: sourceError.message,
          code: sourceError.code,
        },
        sourceError.status,
      );
    }

    try {
      await updatePublicProfile(supabaseAdmin, body, normalizedEmail);
    } catch (error) {
      const sourceError = error instanceof FunctionError
        ? error
        : new FunctionError(
          409,
          'public_profile_update_failed',
          getErrorMessage(error),
        );
      const rollback = await compensateBeforeEmailSend(
        supabaseAdmin,
        {
          profileSnapshot: targetProfile,
          profileWasUpdated: false,
          currentEmail: normalizedEmail,
          previousEmail: currentEmail,
          previousEmailWasVerified,
        },
      );

      if (!rollback.success) {
        return rollbackFailedResponse(sourceError, rollback);
      }

      return jsonResponse(
        {
          error: sourceError.message,
          code: sourceError.code,
          warning:
            'La actualización de Auth se revirtió porque public.usuario no pudo actualizarse.',
          authRestored: true,
          publicProfileRestored: true,
        },
        sourceError.status,
      );
    }

    try {
      await assertFinalAuthState(supabaseAdmin, {
        authId: body.auth_id,
        expectedEmail: normalizedEmail,
        expectedVerified: !emailVerificationEnabled,
      });
    } catch (error) {
      const sourceError = error instanceof FunctionError
        ? error
        : new FunctionError(
          500,
          'auth_email_update_failed',
          getErrorMessage(error),
        );
      const rollback = await compensateBeforeEmailSend(
        supabaseAdmin,
        {
          profileSnapshot: targetProfile,
          profileWasUpdated: true,
          currentEmail: normalizedEmail,
          previousEmail: currentEmail,
          previousEmailWasVerified,
        },
      );

      if (!rollback.success) {
        return rollbackFailedResponse(sourceError, rollback);
      }

      return jsonResponse(
        {
          error: sourceError.message,
          code: sourceError.code,
          authRestored: true,
          publicProfileRestored: true,
        },
        sourceError.status,
      );
    }

    if (password) {
      try {
        await updateAuthUser(
          supabaseAdmin,
          body.auth_id,
          { password },
          'auth_password_update_failed',
        );
      } catch (error) {
        const sourceError = error instanceof FunctionError
          ? error
          : new FunctionError(
            400,
            'auth_password_update_failed',
            getErrorMessage(error),
          );
        const rollback = await compensateBeforeEmailSend(
          supabaseAdmin,
          {
            profileSnapshot: targetProfile,
            profileWasUpdated: true,
            currentEmail: normalizedEmail,
            previousEmail: currentEmail,
            previousEmailWasVerified,
          },
        );

        if (!rollback.success) {
          return rollbackFailedResponse(sourceError, rollback);
        }

        return jsonResponse(
          {
            error: sourceError.message,
            code: sourceError.code,
            authRestored: true,
            publicProfileRestored: true,
          },
          sourceError.status,
        );
      }
    }

    if (emailVerificationEnabled && confirmationUrl) {
      const emailHtml = renderVerificationEmail({
        confirmationUrl,
        currentEmail,
        newEmail: normalizedEmail,
        appUrl,
        nombre: body.nombre,
      });

      try {
        await sendVerificationEmail({
          to: normalizedEmail,
          html: emailHtml,
        });
      } catch (sendError) {
        const message = getErrorMessage(
          sendError,
          'No se pudo enviar el correo de verificación.',
        );
        logStructuredError('verification_email_send_failed', {
          authId: body.auth_id,
          userId: body.id,
          code: 'verification_email_send_failed',
          error: message,
        });

        // Do not roll back here. A network failure can happen after Resend
        // accepted the message; keeping the pending state leaves that link
        // valid and allows the existing resend flow to rotate it safely.
        return jsonResponse(
          {
            error: message,
            code: 'verification_email_send_failed',
            emailUpdated: true,
            publicProfileUpdated: true,
            emailVerificationPending: true,
            verificationEmailSent: false,
            retryable: true,
          },
          502,
        );
      }
    }

    if (!emailVerificationEnabled) {
      return jsonResponse({
        message: 'Usuario actualizado correctamente.',
      });
    }

    return jsonResponse({
      message: 'Usuario actualizado correctamente.',
      emailVerificationRequired: true,
      emailVerificationPending: true,
      verificationEmailSent: true,
    });
  } catch (error) {
    if (error instanceof FunctionError) {
      return jsonResponse(
        {
          error: error.message,
          code: error.code,
          ...error.details,
        },
        error.status,
      );
    }

    const message = getErrorMessage(error, 'Unexpected error.');
    logStructuredError('update_admin_user_unexpected_error', {
      error: message,
    });

    return jsonResponse(
      {
        error: message,
        code: 'unexpected_error',
      },
      500,
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}