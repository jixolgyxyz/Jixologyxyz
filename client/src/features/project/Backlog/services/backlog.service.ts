import { supabase } from '@/core/supabase/supabase.client';
import type {
  BacklogItemRecord,
  BacklogStatusRecord,
  BacklogPriorityRecord,
  BacklogTypeRecord,
  SprintRecord,
  UserRecord,
  SugerenciaRecord,
  ProjectEtiquetaRecord,
  CreateBacklogItemPayload,
  CreateSprintPayload,
  UpdateSprintPayload,
  UpdateBacklogItemPayload,
} from '../types/backlog.types';

export async function fetchBacklogItems(projectId?: number): Promise<BacklogItemRecord[]> {
  let query = supabase
    .from('backlog_item')
    .select('*')
    .order('fecha_creacion', { ascending: true });

  if (projectId != null) query = query.eq('id_proyecto', projectId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBacklogStatuses(): Promise<BacklogStatusRecord[]> {
  const { data, error } = await supabase
    .from('estatus_backlog_item')
    .select('id, nombre, orden, es_terminal')
    .order('orden', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBacklogPriorities(): Promise<BacklogPriorityRecord[]> {
  const { data, error } = await supabase
    .from('prioridad_backlog_item')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBacklogTypes(): Promise<BacklogTypeRecord[]> {
  const { data, error } = await supabase
    .from('tipo_backlog_item')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSprintsByProject(projectId: number): Promise<SprintRecord[]> {
  const { data, error } = await supabase
    .from('sprint')
    .select('id, nombre, objetivo, fecha_inicio, fecha_final, id_proyecto, id_usuario_creador, id_estatus')
    .eq('id_proyecto', projectId)
    .order('fecha_inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchProjectMembers(): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, email')
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBacklogItem(payload: CreateBacklogItemPayload): Promise<BacklogItemRecord> {
  const { data, error } = await supabase
    .from('backlog_item')
    .insert({
      nombre:                payload.nombre,
      fecha_creacion:        new Date().toISOString(),
      descripcion:           payload.descripcion ?? null,
      id_tipo:               payload.id_tipo ?? null,
      id_estatus:            payload.id_estatus,
      id_prioridad:          payload.id_prioridad ?? null,
      id_sprint:             payload.id_sprint ?? null,
      id_usuario_responsable: payload.id_usuario_responsable ?? null,
      fecha_inicio:          payload.fecha_inicio ?? null,
      fecha_vencimiento:     payload.fecha_vencimiento ?? null,
      id_backlog_item_padre: payload.id_backlog_item_padre ?? null,
      id_proyecto:           payload.id_proyecto,
      id_usuario_creador:    payload.id_usuario_creador,
      es_terminal:           false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createSprint(payload: CreateSprintPayload): Promise<SprintRecord> {
  const { data, error } = await supabase
    .from('sprint')
    .insert({
      nombre:                payload.nombre,
      objetivo:              payload.objetivo,
      fecha_inicio:          payload.fecha_inicio,
      fecha_final:           payload.fecha_final,
      id_proyecto:           payload.id_proyecto,
      id_usuario_creador:    payload.id_usuario_creador,
      id_estatus:            payload.id_estatus,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSprint(id: number, payload: UpdateSprintPayload): Promise<void> {
  const { error } = await supabase
    .from('sprint')
    .update({
      nombre:       payload.nombre,
      objetivo:     payload.objetivo ?? null,
      fecha_inicio: payload.fecha_inicio,
      fecha_final:  payload.fecha_final,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateBacklogItem(id: number, payload: UpdateBacklogItemPayload): Promise<BacklogItemRecord> {
  const { data, error } = await supabase
    .from('backlog_item')
    .update({
      nombre:                 payload.nombre,
      descripcion:            payload.descripcion ?? null,
      id_tipo:                payload.id_tipo ?? null,
      id_estatus:             payload.id_estatus,
      id_prioridad:           payload.id_prioridad ?? null,
      id_sprint:              payload.id_sprint ?? null,
      fecha_inicio:           payload.fecha_inicio ?? null,
      fecha_vencimiento:      payload.fecha_vencimiento ?? null,
      id_backlog_item_padre:  payload.id_backlog_item_padre  ?? null,
      id_usuario_responsable: payload.id_usuario_responsable ?? null,
      complejidad:            payload.complejidad ?? null,
      ...(payload.tiempo           !== undefined ? { tiempo:           payload.tiempo           ?? null } : {}),
      ...(payload.tiempo_estimado  !== undefined ? { tiempo_estimado:  payload.tiempo_estimado  ?? null } : {}),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSugerencias(projectId: number): Promise<SugerenciaRecord[]> {
  const { data, error } = await supabase
    .from('backlog_item_sugerencia_creacion')
    .select('id, aceptada, id_usuario_acepto, backlog_item!inner(id_proyecto)')
    .eq('backlog_item.id_proyecto', projectId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id:                row.id,
    aceptada:          row.aceptada,
    id_usuario_acepto: row.id_usuario_acepto,
  }));
}

export async function fetchProjectEtiquetas(projectId: number): Promise<ProjectEtiquetaRecord[]> {
  const { data, error } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .select('id_usuario, id_etiqueta_proyecto_predeterminada, id_proyecto')
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteBacklogItem(id: number): Promise<void> {
  const { error } = await supabase
    .from('backlog_item')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function createSugerencia(itemId: number): Promise<void> {
  const { error } = await supabase
    .from('backlog_item_sugerencia_creacion')
    .insert({ id: itemId, aceptada: false, id_usuario_acepto: null });

  if (error) throw new Error(error.message);
}

export async function acceptSugerencia(itemId: number, userId: number): Promise<void> {
  const { error } = await supabase
    .from('backlog_item_sugerencia_creacion')
    .update({ aceptada: true, id_usuario_acepto: userId })
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}
