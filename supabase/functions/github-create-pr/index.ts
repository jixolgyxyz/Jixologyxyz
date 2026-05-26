import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSign } from 'node:crypto';

// --- Types ---

interface CreatePrPayload {
  projectId: number;
  itemId: number;
  title: string;
  body?: string;
  baseBranch?: string;
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

// --- Handler ---

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: CreatePrPayload;
  try {
    body = await req.json() as CreatePrPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { projectId, itemId, title, body: prBody, baseBranch } = body;
  if (!projectId || !itemId || !title) {
    return new Response('Missing required fields: projectId, itemId, title', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Get GitHub config for the project ---
  const { data: config, error: configErr } = await supabase
    .from('proyecto_github_config')
    .select('installation_id, github_org, github_repo')
    .eq('id_proyecto', projectId)
    .single<GithubConfig>();

  if (configErr || !config) {
    return new Response('GitHub not configured for this project', { status: 404 });
  }

  // --- Get branch name for the backlog item ---
  const { data: githubRecord, error: branchErr } = await supabase
    .from('github_backlog_item')
    .select('branch_name')
    .eq('id_backlog_item', itemId)
    .single();

  if (branchErr || !githubRecord) {
    return new Response('No branch found for this item. Create a branch first.', { status: 404 });
  }

  const appId      = Deno.env.get('GITHUB_APP_ID');
  const privateKey = Deno.env.get('GITHUB_APP_PRIVATE_KEY');

  if (!appId || !privateKey) {
    return new Response('Missing GitHub App credentials', { status: 500 });
  }

  try {
    const jwt   = createGitHubJWT(appId, privateKey);
    const token = await getInstallationToken(config.installation_id, jwt);

    // --- Get default branch if baseBranch not specified ---
    let base = baseBranch;
    if (!base) {
      const repoRes = await fetch(
        `https://api.github.com/repos/${config.github_org}/${config.github_repo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      if (!repoRes.ok) throw new Error('Failed to fetch repo info');
      const repoData = await repoRes.json();
      base = repoData.default_branch as string;
    }

    // --- Create PR ---
    const prRes = await fetch(
      `https://api.github.com/repos/${config.github_org}/${config.github_repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body:  prBody ?? '',
          head:  githubRecord.branch_name,
          base,
        }),
      },
    );

    if (!prRes.ok) {
      const err = await prRes.json();
      throw new Error(`Failed to create PR: ${err.message}`);
    }

    const pr = await prRes.json();

    // --- Save PR info to DB ---
    const { error: dbErr } = await supabase
      .from('github_backlog_item')
      .update({
        pr_number: pr.number,
        pr_url:    pr.html_url,
        pr_status: 'open',
      })
      .eq('id_backlog_item', itemId);

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);

    return new Response(
      JSON.stringify({ prNumber: pr.number, prUrl: pr.html_url }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
