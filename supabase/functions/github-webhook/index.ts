import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';

// --- Types ---

interface PullRequestEvent {
  action: string;
  pull_request: {
    number: number;
    merged: boolean;
    html_url: string;
    head: { ref: string };
  };
  repository: {
    full_name: string;
  };
}

// --- Helpers ---

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac   = createHmac('sha256', secret);
  hmac.update(body);
  const digest = `sha256=${hmac.digest('hex')}`;

  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- Handler ---

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response('Missing webhook secret', { status: 500 });
  }

  const signature = req.headers.get('X-Hub-Signature-256');
  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }

  const body = await req.text();

  if (!verifySignature(body, signature, webhookSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = req.headers.get('X-GitHub-Event');
  if (event !== 'pull_request') {
    return new Response('Event ignored', { status: 200 });
  }

  const payload = JSON.parse(body) as PullRequestEvent;
  const { action, pull_request, repository } = payload;

  if (action !== 'closed') {
    return new Response('Action ignored', { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const branchName = pull_request.head.ref;

  // --- Find backlog item by branch name ---
  const { data: githubRecord, error: findErr } = await supabase
    .from('backlog_item_github')
    .select('id_backlog_item')
    .eq('branch_name', branchName)
    .single();

  if (findErr || !githubRecord) {
    return new Response('Branch not tracked in Jixology', { status: 200 });
  }

  const itemId = githubRecord.id_backlog_item as number;

  // --- Update pr info in backlog_item_github ---
  const prStatus = pull_request.merged ? 'merged' : 'closed';

  await supabase
    .from('backlog_item_github')
    .update({
      pr_number: pull_request.number,
      pr_url:    pull_request.html_url,
      pr_status: prStatus,
    })
    .eq('id_backlog_item', itemId);

  // --- If merged, move backlog item to "Pendiente" status (awaits manual acceptance) ---
  if (pull_request.merged) {
    const { data: pendingStatus } = await supabase
      .from('estatus_backlog_item')
      .select('id')
      .eq('nombre', 'Pendiente')
      .single();

    if (pendingStatus) {
      await supabase
        .from('backlog_item')
        .update({ id_estatus: pendingStatus.id })
        .eq('id', itemId);
    }
  }

  return new Response(JSON.stringify({ ok: true, itemId, prStatus }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
