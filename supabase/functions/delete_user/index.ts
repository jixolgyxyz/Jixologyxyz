import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type DeleteUserPayload = {
  id: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed.' },
        { status: 405, headers: corsHeaders }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'Missing Authorization header.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return Response.json(
        { error: 'Missing Supabase environment variables.' },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabaseUser.auth.getUser();

    if (requesterError || !requester) {
      return Response.json(
        { error: 'Unauthorized.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: requesterProfile, error: requesterProfileError } =
      await supabaseAdmin
        .from('usuario')
        .select('id_rol_global')
        .eq('auth_id', requester.id)
        .single();

    if (
      requesterProfileError ||
      !requesterProfile ||
      requesterProfile.id_rol_global !== 1
    ) {
      return Response.json(
        { error: 'Solo un administrador puede eliminar usuarios.' },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = (await req.json()) as DeleteUserPayload;

    if (!body?.id || Number.isNaN(Number(body.id))) {
      return Response.json(
        { error: 'ID de usuario inválido.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('usuario')
      .select(
        'id, auth_id, email, telefono, nombre, apellido, fecha_nacimiento, sobre_mi, jornada, fecha_creacion, id_zona_horaria, id_rol_global'
      )
      .eq('id', body.id)
      .single();

    if (targetUserError || !targetUser) {
      return Response.json(
        { error: 'No se encontró el usuario.' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (targetUser.auth_id === requester.id) {
      return Response.json(
        { error: 'No puedes eliminar tu propio usuario.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const backupRow = { ...targetUser };

    const { error: deleteUsuarioError } = await supabaseAdmin
      .from('usuario')
      .delete()
      .eq('id', body.id);

    if (deleteUsuarioError) {
      return Response.json(
        { error: deleteUsuarioError.message || 'No se pudo eliminar de usuario.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUser.auth_id
    );

    if (deleteAuthError) {
      const { error: restoreError } = await supabaseAdmin
        .from('usuario')
        .insert(backupRow);

      return Response.json(
        {
          error: deleteAuthError.message || 'No se pudo eliminar el usuario de Auth.',
          rollbackError: restoreError?.message ?? null,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      { message: 'Usuario eliminado correctamente.' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado en la Edge Function.',
      },
      { status: 500, headers: corsHeaders }
    );
  }
});