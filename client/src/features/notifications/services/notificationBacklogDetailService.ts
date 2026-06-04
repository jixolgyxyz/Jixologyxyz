import { supabase } from '@/core/supabase/supabase.client';
import type {
  BacklogItemRecord,
  BacklogMeta,
  ProjectEtiquetaRecord,
  SugerenciaRecord,
  UserRecord,
} from '@/features/project/Backlog/types/backlog.types';

type UserProjectRow = {
  usuario: UserRecord | UserRecord[] | null;
};

export async function getBacklogItemForNotification(
  itemId: number,
): Promise<BacklogItemRecord | null> {
  const { data, error } = await supabase
    .from('backlog_item')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as BacklogItemRecord | null;
}

export async function getBacklogMetaForNotificationProject(
  projectId: number,
): Promise<BacklogMeta> {
  const [
    typesResult,
    statusesResult,
    prioritiesResult,
    sprintsResult,
    itemsResult,
    usersResult,
    sugerenciasResult,
    etiquetasResult,
  ] = await Promise.all([
    supabase.from('tipo_backlog_item').select('*').order('id'),
    supabase.from('estatus_backlog_item').select('*').order('orden'),
    supabase.from('prioridad_backlog_item').select('*').order('id'),
    supabase.from('sprint').select('*').eq('id_proyecto', projectId).order('fecha_inicio'),
    supabase.from('backlog_item').select('*').eq('id_proyecto', projectId),
    supabase
      .from('usuario_proyecto')
      .select('usuario:usuario(id,nombre,apellido,email)')
      .eq('id_proyecto', projectId),
    supabase
      .from('backlog_item_sugerencia_creacion')
      .select('id, aceptada, id_usuario_acepto, backlog_item!inner(id_proyecto)')
      .eq('backlog_item.id_proyecto', projectId),
    supabase
      .from('etiqueta_proyecto_predeterminada')
      .select('id_usuario, id_etiqueta_proyecto_predeterminada, id_proyecto')
      .eq('id_proyecto', projectId),
  ]);

  const firstError =
    typesResult.error ??
    statusesResult.error ??
    prioritiesResult.error ??
    sprintsResult.error ??
    itemsResult.error ??
    usersResult.error ??
    sugerenciasResult.error ??
    etiquetasResult.error;

  if (firstError) throw new Error(firstError.message);

  return {
    types: typesResult.data ?? [],
    statuses: statusesResult.data ?? [],
    priorities: prioritiesResult.data ?? [],
    sprints: sprintsResult.data ?? [],
    items: (itemsResult.data ?? []) as BacklogItemRecord[],
    users: ((usersResult.data ?? []) as UserProjectRow[])
      .flatMap((row) => {
        if (Array.isArray(row.usuario)) return row.usuario;
        return row.usuario ? [row.usuario] : [];
      })
      .filter((user): user is UserRecord => Boolean(user)),
    sugerencias: ((sugerenciasResult.data ?? []) as SugerenciaRecord[]).map(row => ({
      id: row.id,
      aceptada: row.aceptada,
      id_usuario_acepto: row.id_usuario_acepto,
    })),
    etiquetas: (etiquetasResult.data ?? []) as ProjectEtiquetaRecord[],
  } as BacklogMeta;
}
