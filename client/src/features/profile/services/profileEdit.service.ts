import { supabase } from '@/core/supabase/supabase.client';

export interface ZonaHorariaOption {
  id: number;
  nombre: string;
}

export async function fetchZonaHorarias(): Promise<ZonaHorariaOption[]> {
  const { data, error } = await supabase
    .from('zona_horaria')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
// ── GitHub connection ─────────────────────────────────────────────

export interface GithubUsuarioRecord {
  github_username: string;
  github_avatar_url: string | null;
  connected_at: string;
}

export async function fetchOwnGithubConnection(): Promise<GithubUsuarioRecord | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('No autenticado.');

  const { data: usuarioRow } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_id', user.id)
    .single<{ id: number }>();

  if (!usuarioRow) return null;

  const { data, error } = await supabase
    .from('github_usuario')
    .select('github_username, github_avatar_url, connected_at')
    .eq('id_usuario', usuarioRow.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as GithubUsuarioRecord | null;
}

export async function disconnectGithub(): Promise<void> {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !session) throw new Error('No autenticado.');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-user-disconnect`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    },
  );

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'No se pudo desconectar GitHub.');
  }
}

export async function buildGithubConnectUrl(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('No autenticado.');

  const state = btoa(JSON.stringify({ authId: user.id }));
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string;
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user,read:org&state=${state}`;
}

export interface OwnProfileEditData {
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
}

export interface UpdateOwnProfilePayload {
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
}

export async function getOwnProfileEditService(): Promise<OwnProfileEditData> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No se pudo identificar al usuario autenticado.');
  }

  const { data, error } = await supabase
    .from('usuario')
    .select('sobre_mi, jornada, id_zona_horaria')
    .eq('auth_id', user.id)
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo cargar el perfil editable.');
  }

  return data as OwnProfileEditData;
}

export async function updateOwnProfileService(
  payload: UpdateOwnProfilePayload
): Promise<{ message: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No se pudo identificar al usuario autenticado.');
  }

  const { data, error } = await supabase
    .from('usuario')
    .update({
      sobre_mi: payload.sobre_mi,
      jornada: payload.jornada,
      id_zona_horaria: payload.id_zona_horaria,
    })
    .eq('auth_id', user.id)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar el perfil.');
  }

  if (!data) {
    throw new Error('No se encontró el perfil para actualizar.');
  }

  return { message: 'Perfil actualizado correctamente.' };
}