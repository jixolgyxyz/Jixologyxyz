import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getBooleanEnv } from '../_shared/env.ts';

type ResendVerificationEmailResult =
  | { status: 'success'; message?: string }
  | { status: 'cooldown'; message?: string; cooldownSeconds: number }
  | { status: 'error'; message?: string };

type UsuarioVerificationRow = {
  id: number;
  auth_id: string;
  email: string;
};

type VerificationRateLimitRow = {
  fecha_envio: string;
  completada: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FALLBACK_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(
  body: ResendVerificationEmailResult,
  status = 200
): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringProperty(
  source: Record<string, unknown>,
  key: string
): string | null {
  const value = source[key];
  return typeof value === 'string' ? value : null;
}

function getNumberProperty(
  source: Record<string, unknown>,
  key: string
): number | null {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error)) {
    return (
      getStringProperty(error, 'message') ??
      getStringProperty(error, 'error') ??
      'Ocurrió un error inesperado.'
    );
  }

  return 'Ocurrió un error inesperado.';
}

function getErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  return (
    getNumberProperty(error, 'status') ??
    getNumberProperty(error, 'statusCode')
  );
}

function getCooldownSecondsFromMessage(message: string): number | null {
  const explicitSeconds =
    message.match(/(?:after|in)\s+(\d+)\s+seconds?/i)?.[1] ??
    message.match(/(\d+)\s*(?:s|sec|seconds?)/i)?.[1];

  if (!explicitSeconds) {
    return null;
  }

  const parsedSeconds = Number(explicitSeconds);
  return Number.isFinite(parsedSeconds) && parsedSeconds > 0
    ? parsedSeconds
    : null;
}

function getSupabaseCooldownSeconds(error: unknown): number | null {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();
  const status = getErrorStatus(error);
  const looksLikeCooldown =
    status === 429 ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('over_email_send_rate_limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('only request this after') ||
    lowerMessage.includes('security purposes');

  if (!looksLikeCooldown) {
    return null;
  }

  return getCooldownSecondsFromMessage(message) ?? FALLBACK_COOLDOWN_SECONDS;
}

function getRemainingCooldownSeconds(lastSentAt: string): number {
  const lastSentTime = new Date(lastSentAt).getTime();

  if (Number.isNaN(lastSentTime)) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - lastSentTime) / 1000);
  return Math.max(FALLBACK_COOLDOWN_SECONDS - elapsedSeconds, 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { status: 'error', message: 'Method not allowed.' },
      405
    );
  }

  try {
    if (!getBooleanEnv('EMAIL_VERIFICATION_ENABLED', true)) {
      return jsonResponse({
        status: 'error',
        message: 'La verificación de correo está deshabilitada.',
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          status: 'error',
          message: 'Faltan variables de entorno de Supabase.',
        },
        500
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        status: 'error',
        message: 'El cuerpo de la solicitud debe ser JSON válido.',
      });
    }

    if (!isRecord(body)) {
      return jsonResponse({
        status: 'error',
        message: 'El cuerpo de la solicitud debe incluir un correo.',
      });
    }

    const rawEmail = getStringProperty(body, 'email');
    const email = rawEmail ? normalizeEmail(rawEmail) : '';

    if (!email || !EMAIL_PATTERN.test(email)) {
      return jsonResponse({
        status: 'error',
        message: 'El correo no tiene un formato válido.',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .select('id, auth_id, email')
      .eq('email', email)
      .maybeSingle<UsuarioVerificationRow>();

    if (usuarioError) {
      return jsonResponse({
        status: 'error',
        message: usuarioError.message || 'No se pudo validar el usuario.',
      });
    }

    if (!usuario) {
      return jsonResponse({
        status: 'error',
        message: 'No encontramos una cuenta pendiente para este correo.',
      });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(usuario.auth_id);

    if (authError || !authData.user) {
      return jsonResponse({
        status: 'error',
        message:
          authError?.message ||
          'No se encontró el usuario asociado en Supabase Auth.',
      });
    }

    const authEmail = authData.user.email
      ? normalizeEmail(authData.user.email)
      : null;

    if (authEmail !== email) {
      return jsonResponse({
        status: 'error',
        message:
          'El correo del perfil no coincide con el usuario de autenticación.',
      });
    }

    if (authData.user.email_confirmed_at) {
      const { error: verificationUpdateError } = await supabaseAdmin
        .from('verificacion')
        .upsert(
          {
            id_usuario: usuario.id,
            fecha_envio: new Date().toISOString(),
            completada: true,
          },
          { onConflict: 'id_usuario' }
        );

      if (verificationUpdateError) {
        console.warn(
          '[resend_verification_email] No se pudo actualizar verificacion:',
          verificationUpdateError.message
        );
      }

      return jsonResponse({
        status: 'error',
        message:
          'Este correo ya fue verificado. Vuelve al inicio de sesión para entrar.',
      });
    }

    const { data: verificationRow, error: verificationError } =
      await supabaseAdmin
        .from('verificacion')
        .select('fecha_envio, completada')
        .eq('id_usuario', usuario.id)
        .maybeSingle<VerificationRateLimitRow>();

    if (verificationError) {
      return jsonResponse({
        status: 'error',
        message:
          verificationError.message ||
          'No se pudo validar el tiempo de espera.',
      });
    }

    if (verificationRow && !verificationRow.completada) {
      const remainingSeconds = getRemainingCooldownSeconds(
        verificationRow.fecha_envio
      );

      if (remainingSeconds > 0) {
        return jsonResponse({
          status: 'cooldown',
          message:
            'Ya se solicitó un correo recientemente. Intenta de nuevo cuando termine el tiempo de espera.',
          cooldownSeconds: remainingSeconds,
        });
      }
    }

    const redirectBaseUrl = appUrl.replace(/\/+$/, '');
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${redirectBaseUrl}/correo-verificacion/redireccion`,
      },
    });

    if (resendError) {
      const cooldownSeconds = getSupabaseCooldownSeconds(resendError);

      if (cooldownSeconds !== null) {
        return jsonResponse({
          status: 'cooldown',
          message:
            'Supabase limitó temporalmente el reenvío. Intenta de nuevo cuando termine el tiempo de espera.',
          cooldownSeconds,
        });
      }

      return jsonResponse({
        status: 'error',
        message:
          resendError.message ||
          'No se pudo reenviar el correo de verificación.',
      });
    }

    const { error: verificationUpsertError } = await supabaseAdmin
      .from('verificacion')
      .upsert(
        {
          id_usuario: usuario.id,
          fecha_envio: new Date().toISOString(),
          completada: false,
        },
        { onConflict: 'id_usuario' }
      );

    if (verificationUpsertError) {
      console.warn(
        '[resend_verification_email] No se pudo guardar cooldown:',
        verificationUpsertError.message
      );
    }

    return jsonResponse({
      status: 'success',
      message: 'Te enviamos un nuevo correo de verificación.',
    });
  } catch (error) {
    return jsonResponse(
      {
        status: 'error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});
