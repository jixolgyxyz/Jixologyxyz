import { createClient } from 'npm:@supabase/supabase-js@2';

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
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://frontend-au36.onrender.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: requester },
      error: requesterError,
    } = await supabaseUser.auth.getUser(token);

    if (requesterError || !requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('usuario')
      .select('id_rol_global')
      .eq('auth_id', requester.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.id_rol_global !== 1) {
      return new Response(
        JSON.stringify({ error: 'Solo un administrador puede actualizar usuarios.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await req.json()) as UpdateAdminUserPayload;

    if (!body.id || !body.auth_id || !body.email) {
      return new Response(JSON.stringify({ error: 'Payload incompleto.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authAttributes: Record<string, string> = {
      email: body.email.trim().toLowerCase(),
    };

    if (body.password && body.password.trim()) {
      authAttributes.password = body.password.trim();
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      body.auth_id,
      authAttributes
    );

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: userError } = await supabaseAdmin
      .from('usuario')
      .update({
        email: body.email.trim().toLowerCase(),
        nombre: body.nombre,
        apellido: body.apellido,
        telefono: body.telefono,
        fecha_nacimiento: body.fecha_nacimiento,
        sobre_mi: body.sobre_mi,
        jornada: body.jornada,
        id_zona_horaria: body.id_zona_horaria,
        id_rol_global: body.id_rol_global,
      })
      .eq('id', body.id);

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ message: 'Usuario actualizado correctamente.' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});