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

  const url = new URL(req.url);
  const installationId = url.searchParams.get('installation_id');
  if (!installationId) {
    return new Response('Missing installation_id query parameter', { status: 400 });
  }

  const authId = getAuthId(authHeader);
  if (!authId) {
    return new Response('Unauthorized', { status: 401 });
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
    return new Response('User not found', { status: 404 });
  }

  const { data: ghRow, error: ghErr } = await adminClient
    .from('github_usuario')
    .select('github_access_token')
    .eq('id_usuario', usuarioRow.id)
    .single<{ github_access_token: string }>();

  if (ghErr || !ghRow) {
    return new Response('GitHub not connected', { status: 404 });
  }

  const ghHeaders = {
    Authorization: `Bearer ${ghRow.github_access_token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const reposRes = await fetch(
    `https://api.github.com/user/installations/${installationId}/repositories?per_page=100`,
    { headers: ghHeaders },
  );

  if (!reposRes.ok) {
    return new Response('Failed to fetch repos from GitHub', { status: 502 });
  }

  const data = await reposRes.json() as {
    repositories: Array<{ name: string; full_name: string; private: boolean }>;
  };

  return new Response(
    JSON.stringify(
      data.repositories.map(r => ({ name: r.name, full_name: r.full_name, private: r.private })),
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
