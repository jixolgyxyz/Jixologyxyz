import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface ConnectState {
  authId: string;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code     = url.searchParams.get('code');
  const rawState = url.searchParams.get('state');

  if (!code || !rawState) {
    return new Response('Missing code or state', { status: 400 });
  } 

  let state: ConnectState;
  try {
    state = JSON.parse(atob(rawState)) as ConnectState;
  } catch {
    return new Response('Invalid state parameter', { status: 400 });
  }

  if (!state.authId) {
    return new Response('Incomplete state', { status: 400 });
  }

  const clientId     = Deno.env.get('GITHUB_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')!;
  const appUrl       = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

  // --- Exchange code for access token ---
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    return new Response('Failed to exchange code for token', { status: 502 });
  }

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return new Response(`GitHub OAuth error: ${tokenData.error ?? 'unknown'}`, { status: 400 });
  }

  const accessToken = tokenData.access_token;

  // --- Fetch GitHub user profile ---
  const ghUserRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!ghUserRes.ok) {
    return new Response('Failed to fetch GitHub user', { status: 502 });
  }

  const ghUser = await ghUserRes.json() as {
    id: number;
    login: string;
    avatar_url: string;
  };

  // --- Save to github_usuario via service role ---
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve id_usuario from auth_id
  const { data: usuarioRow, error: usuarioErr } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_id', state.authId)
    .single<{ id: number }>();

  if (usuarioErr || !usuarioRow) {
    return new Response('User not found', { status: 404 });
  }

  const { error: upsertErr } = await supabase
    .from('github_usuario')
    .upsert(
      {
        id_usuario:          usuarioRow.id,
        github_id:           ghUser.id,
        github_username:     ghUser.login,
        github_avatar_url:   ghUser.avatar_url,
        github_access_token: accessToken,
      },
      { onConflict: 'id_usuario' },
    );

  if (upsertErr) {
    return new Response(`DB error: ${upsertErr.message}`, { status: 500 });
  }

  return Response.redirect(`${appUrl}/perfil?github=connected`, 302);
});
