import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface GithubCallbackState {
  projectId: number;
  org: string;
  repo: string;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const installationId = url.searchParams.get('installation_id');
  const rawState = url.searchParams.get('state');

  if (!installationId || !rawState) {
    return new Response('Missing installation_id or state', { status: 400 });
  }

  let state: GithubCallbackState;
  try {
    state = JSON.parse(atob(rawState)) as GithubCallbackState;
  } catch {
    return new Response('Invalid state parameter', { status: 400 });
  }

  if (!state.projectId || !state.org || !state.repo) {
    return new Response('Incomplete state', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase
    .from('proyecto_github_config')
    .upsert(
      {
        id_proyecto:     state.projectId,
        github_org:      state.org,
        github_repo:     state.repo,
        installation_id: Number(installationId),
      },
      { onConflict: 'id_proyecto' },
    );

  if (error) {
    return new Response(`DB error: ${error.message}`, { status: 500 });
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
  return Response.redirect(
    `${appUrl}/proyectos/${state.projectId}/configuracion?github=connected`,
    302,
  );
});

// http para comprobar: http://127.0.0.1:54321/functions/v1/github-oauth-callback?installation_id=12345&state
  =eyJwcm9qZWN0SWQiOjEsIm9yZyI6Im1pLWVtcHJlc2EiLCJyZXBvIjoibWktcmVwbyJ9