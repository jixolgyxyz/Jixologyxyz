import { supabase } from '@/core/supabase/supabase.client';

export interface ZonaHorariaOption {
  id: number;
  label: string;
}

export interface RolGlobalOption {
  id: number;
  label: string;
}

export async function getZonaHorariaOptions(): Promise<ZonaHorariaOption[]> {
  const { data, error } = await supabase
    .from('zona_horaria')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(error.message || 'No se pudieron cargar las zonas horarias.');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.nombre,
  }));
}

export async function getRolGlobalOptions(): Promise<RolGlobalOption[]> {
  const { data, error } = await supabase
    .from('rol_global')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message || 'No se pudieron cargar los roles globales.');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.nombre,
  }));
}