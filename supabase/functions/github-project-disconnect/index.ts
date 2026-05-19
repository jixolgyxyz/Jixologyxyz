import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
  if (req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Missing authorization header', { status: 401 });
  }

  const authId = getAuthId(authHeader);
  if (!authId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { projectId: number };
  try {
    body = await req.json() as { projectId: number };
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!body.projectId) {
    return new Response('Missing projectId', { status: 400 });
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

  const { error: deleteErr } = await adminClient
    .from('proyecto_github_config')
    .delete()
    .eq('id_proyecto', body.projectId);

  if (deleteErr) {
    return new Response(`DB error: ${deleteErr.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
