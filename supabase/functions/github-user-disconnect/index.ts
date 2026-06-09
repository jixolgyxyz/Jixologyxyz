import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors();

  if (req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: usuarioRow, error: usuarioErr } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_id', user.id)
    .single<{ id: number }>();

  if (usuarioErr || !usuarioRow) {
    return new Response('User not found', { status: 404, headers: corsHeaders });
  }

  const { error: deleteErr } = await supabase
    .from('github_usuario')
    .delete()
    .eq('id_usuario', usuarioRow.id);

  if (deleteErr) {
    return new Response(`DB error: ${deleteErr.message}`, { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
