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
  const rawState       = url.searchParams.get('state');

  // code is received here for future user-level token exchange
  const _code = url.searchParams.get('code');

  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

  if (!installationId) {
    return new Response('Missing installation_id', { status: 400 });
  }

  if (!rawState) {
    return Response.redirect(`${appUrl}?github=installed`, 302);
  }

  let state: Partial<GithubCallbackState>;
  try {
    state = JSON.parse(atob(rawState)) as Partial<GithubCallbackState>;
  } catch {
    return new Response('Invalid state parameter', { status: 400 });
  }

  if (!state.projectId) {
    return new Response('Incomplete state', { status: 400 });
  }

  // Install-only flow (no org/repo yet) — close the tab and notify the opener
  if (!state.org || !state.repo) {
    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) window.opener.postMessage({ type: 'github-installed' }, '*');
      window.close();
    </script></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
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

  return Response.redirect(
    `${appUrl}/projects/${state.projectId}/config?github=connected`,
    302,
  );
});
