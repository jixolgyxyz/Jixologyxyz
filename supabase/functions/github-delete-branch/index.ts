import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSign } from 'node:crypto';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// --- Types ---

interface DeleteBranchPayload {
  projectId: number;
  itemId: number;
}

interface GithubConfig {
  installation_id: number;
  github_org: string;
  github_repo: string;
}

// --- Helpers ---

function createGitHubJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

async function getInstallationToken(installationId: number, jwt: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to get installation token: ${err.message}`);
  }

  const data = await res.json();
  return data.token as string;
}

async function deleteBranch(
  org: string,
  repo: string,
  branchName: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${org}/${repo}/git/refs/heads/${branchName}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!res.ok && res.status !== 204) {
    const err = await res.json();
    throw new Error(`Failed to delete branch: ${err.message}`);
  }
}

// --- Handler ---

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors();

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let body: DeleteBranchPayload;
  try {
    body = await req.json() as DeleteBranchPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  const { projectId, itemId } = body;
  if (!projectId || !itemId) {
    return new Response('Missing required fields: projectId, itemId', { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: config, error: configErr } = await supabase
    .from('proyecto_github_config')
    .select('installation_id, github_org, github_repo')
    .eq('id_proyecto', projectId)
    .single<GithubConfig>();

  if (configErr || !config) {
    return new Response('GitHub not configured for this project', { status: 404, headers: corsHeaders });
  }

  const { data: itemGithub, error: itemErr } = await supabase
    .from('github_backlog_item')
    .select('branch_name')
    .eq('id_backlog_item', itemId)
    .single();

  if (itemErr || !itemGithub?.branch_name) {
    return new Response('No branch found for this item', { status: 404, headers: corsHeaders });
  }

  const appId      = Deno.env.get('APP_ID_GITHUB');
  const privateKey = Deno.env.get('APP_PRIVATE_KEY_GITHUB');

  if (!appId || !privateKey) {
    return new Response('Missing GitHub App credentials', { status: 500, headers: corsHeaders });
  }

  try {
    const jwt   = createGitHubJWT(appId, privateKey);
    const token = await getInstallationToken(config.installation_id, jwt);

    await deleteBranch(config.github_org, config.github_repo, itemGithub.branch_name, token);

    const { error: dbErr } = await supabase
      .from('github_backlog_item')
      .delete()
      .eq('id_backlog_item', itemId);

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);

    return new Response(
      JSON.stringify({ deleted: itemGithub.branch_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
