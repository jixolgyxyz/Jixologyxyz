import { supabase } from '@/core/supabase/supabase.client';

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