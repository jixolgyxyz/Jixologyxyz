import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

function getAuthId(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors();

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Missing Authorization header', { status: 401, headers: corsHeaders });
  }

  const authId = getAuthId(authHeader);
  if (!authId) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: usuarioRow, error: usuarioErr } = await adminClient
    .from('usuario')
    .select('id')
    .eq('auth_id', authId)
    .single<{ id: number }>();

  if (usuarioErr || !usuarioRow) {
    return new Response('User not found', { status: 404, headers: corsHeaders });
  }

  const { data: ghRow, error: ghErr } = await adminClient
    .from('github_usuario')
    .select('github_access_token')
    .eq('id_usuario', usuarioRow.id)
    .single<{ github_access_token: string }>();

  if (ghErr || !ghRow) {
    return new Response('GitHub not connected', { status: 404, headers: corsHeaders });
  }

  const ghHeaders = {
    Authorization: `Bearer ${ghRow.github_access_token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const installRes = await fetch(
    'https://api.github.com/user/installations?per_page=100',
    { headers: ghHeaders },
  );

  if (!installRes.ok) {
    return new Response('Failed to fetch GitHub installations', { status: 502, headers: corsHeaders });
  }

  const data = await installRes.json() as {
    installations: Array<{
      id: number;
      account: { login: string; avatar_url: string };
    }>;
  };

  const result = data.installations.map(i => ({
    installation_id: i.id,
    login: i.account.login,
    avatar_url: i.account.avatar_url,
  }));

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
