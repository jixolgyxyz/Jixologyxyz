import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSign } from 'node:crypto';

// --- Types ---

interface CreateBranchPayload {
  projectId: number;
  itemId: number;
  itemTitle: string;
  branchName?: string;
}

interface GithubConfig {
  installation_id: number;
  github_org: string;
  github_repo: string;
}

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

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

async function getDefaultBranchSha(
  org: string,
  repo: string,
  token: string,
): Promise<{ sha: string; defaultBranch: string }> {
  const repoRes = await fetch(`https://api.github.com/repos/${org}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!repoRes.ok) throw new Error('Failed to fetch repo info');
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch as string;

  const refRes = await fetch(
    `https://api.github.com/repos/${org}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!refRes.ok) throw new Error('Failed to fetch default branch ref');
  const refData = await refRes.json();
  return { sha: refData.object.sha as string, defaultBranch };
}

async function createBranch(
  org: string,
  repo: string,
  branchName: string,
  sha: string,
  token: string,
): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${org}/${repo}/git/refs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
  });

  if (!res.ok) {
    const err = await res.json();
    if (res.status === 422 && (err.message as string)?.includes('Reference already exists')) {
      return;
    }
    throw new Error(`Failed to create branch: ${err.message}`);
  }
}

// --- Handler ---

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: CreateBranchPayload;
  try {
    body = await req.json() as CreateBranchPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { projectId, itemId, itemTitle, branchName: customBranchName } = body;
  if (!projectId || !itemId || !itemTitle) {
    return new Response('Missing required fields: projectId, itemId, itemTitle', { status: 400 });
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
    return new Response('GitHub not configured for this project', { status: 404 });
  }

  let resolvedBranchName: string;
  if (customBranchName) {
    resolvedBranchName = customBranchName;
  } else {
    const PREFIX_MAP: Record<string, string> = {
      'Historia de Usuario': 'feat',
      'Tarea':               'task',
      'Bug':                 'fix',
      'Épica':               'epic',
      'Subtarea':            'subtask',
    };
    const { data: item } = await supabase
      .from('backlog_item')
      .select('tipo_backlog_item(nombre)')
      .eq('id', itemId)
      .single();
    const typeName = item?.tipo_backlog_item?.nombre ?? '';
    const prefix   = PREFIX_MAP[typeName] ?? 'task';
    resolvedBranchName = `${prefix}/JIX-${itemId}-${slugify(itemTitle)}`;
  }

  const appId      = Deno.env.get('GITHUB_APP_ID');
  const privateKey = Deno.env.get('GITHUB_APP_PRIVATE_KEY');

  if (!appId || !privateKey) {
    return new Response('Missing GitHub App credentials', { status: 500 });
  }

  try {
    const jwt   = createGitHubJWT(appId, privateKey);
    const token = await getInstallationToken(config.installation_id, jwt);

    const { sha } = await getDefaultBranchSha(config.github_org, config.github_repo, token);

    await createBranch(config.github_org, config.github_repo, resolvedBranchName, sha, token);

    const { error: dbErr } = await supabase
      .from('github_backlog_item')
      .upsert(
        { id_backlog_item: itemId, branch_name: resolvedBranchName },
        { onConflict: 'id_backlog_item' },
      );

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);

    return new Response(
      JSON.stringify({ branchName: resolvedBranchName }),
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
