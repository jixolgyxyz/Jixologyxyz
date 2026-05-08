import { supabase } from '@/core/supabase/supabase.client';
import type { BacklogItemRecord, SprintRecord } from '@/features/project/Backlog/types/backlog.types';

export interface FteRow {
  id_proyecto: number;
  projectName: string;
  cantidad_horas: number;
  fte: number | null;
}

export interface UserJornadaFte {
  jornada: number | null;
  rows: FteRow[];
}

export async function fetchUserJornadaFte(userId: number): Promise<UserJornadaFte> {
  const [{ data: userData, error: userError }, { data: fteData, error: fteError }] =
    await Promise.all([
      supabase
        .from('usuario')
        .select('jornada')
        .eq('id', userId)
        .single(),
      supabase
        .from('usuario_proyecto_fte')
        .select('id_proyecto, cantidad_horas, fte, proyecto(nombre)')
        .eq('id_usuario', userId)
        .order('id_proyecto', { ascending: true }),
    ]);

  if (userError) throw new Error(userError.message);
  if (fteError)  throw new Error(fteError.message);

  const rows: FteRow[] = (fteData ?? []).map(row => {
    const proj = row.proyecto as unknown as { nombre: string } | null;
    return {
      id_proyecto:    row.id_proyecto,
      projectName:    proj?.nombre ?? `Proyecto ${row.id_proyecto}`,
      cantidad_horas: row.cantidad_horas,
      fte:            row.fte ?? null,
    };
  });

  return { jornada: userData?.jornada ?? null, rows };
}

export async function fetchUserAssignedItems(userId: number): Promise<BacklogItemRecord[]> {
  const { data, error } = await supabase
    .from('backlog_item')
    .select('*')
    .eq('id_usuario_responsable', userId)
    .order('fecha_creacion', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ProjectRecord { id: number; nombre: string }

export async function fetchAllProjects(): Promise<ProjectRecord[]> {
  const { data, error } = await supabase
    .from('proyecto')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllSprints(): Promise<SprintRecord[]> {
  const { data, error } = await supabase
    .from('sprint')
    .select('id, nombre, objetivo, fecha_inicio, fecha_final, id_proyecto, id_usuario_creador, id_estatus')
    .order('fecha_inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
