import { supabase } from '@/core/supabase/supabase.client';
import type {
  ProjectMemberRecord,
  EtiquetaPersonalizadaRecord,
  EtiquetaPredeterminadaRecord,
  MemberEtiquetaRecord,
  MemberEtiquetaPredeterminadaRecord,
  CreateEtiquetaPayload,
  UpdateEtiquetaPayload,
  FteMemberRecord,
  ProyectoFteRecord,
} from '../types/projectConfig.types';

export interface AvailableProjectUserRecord extends ProjectMemberRecord {
  yaInvitado: boolean;
}

// ── Members ───────────────────────────────────────────────────────

async function fetchProjectMemberIds(projectId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('usuario_proyecto')
    .select('id_usuario')
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id_usuario: number }) => r.id_usuario);
}

async function fetchPendingInvitationUserIds(projectId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('invitacion_proyecto')
    .select('id_usuario_destino')
    .eq('id_proyecto', projectId)
    .eq('aceptada', false);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id_usuario_destino: number }) => r.id_usuario_destino);
}

export async function fetchProjectMembers(projectId: number): Promise<ProjectMemberRecord[]> {
  const memberIds = await fetchProjectMemberIds(projectId);
  if (memberIds.length === 0) return [];

  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, email')
    .in('id', memberIds)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAvailableUsers(
  projectId: number,
): Promise<AvailableProjectUserRecord[]> {
  const [memberIds, pendingInviteIds] = await Promise.all([
    fetchProjectMemberIds(projectId),
    fetchPendingInvitationUserIds(projectId),
  ]);

  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, email')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);

  const memberSet = new Set(memberIds);
  const invitedSet = new Set(pendingInviteIds);

  return (data ?? [])
    .filter((u: ProjectMemberRecord) => !memberSet.has(u.id))
    .map((u: ProjectMemberRecord) => ({
      ...u,
      yaInvitado: invitedSet.has(u.id),
    }));
}

export async function sendInvitation(
  userId: number,
  projectId: number,
  creadorId: number,
): Promise<void> {
  const { error, status } = await supabase
    .from('invitacion_proyecto')
    .insert({
      id_usuario_destino: userId,
      id_proyecto: projectId,
      id_usuario_creador: creadorId,
      aceptada: false,
      fecha_envio: new Date().toISOString(),
    });

  // HTTP 409 = unique constraint violation (invitation already pending) — treat as success
  if (error && status !== 409) throw new Error(error.message);
}

// ── Custom etiquetas catalog ──────────────────────────────────────

export async function fetchProjectEtiquetas(
  projectId: number,
): Promise<EtiquetaPersonalizadaRecord[]> {
  const { data, error } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .select('id, nombre, descripcion, color_bloque, color_letra, id_proyecto, id_creador')
    .eq('id_proyecto', projectId)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEtiqueta(
  payload: CreateEtiquetaPayload,
): Promise<EtiquetaPersonalizadaRecord> {
  const { data, error } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .insert({
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? null,
      color_bloque: payload.color_bloque,
      color_letra: payload.color_letra,
      id_proyecto: payload.id_proyecto,
      id_creador: payload.id_creador,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEtiqueta(id: number): Promise<void> {
  const { error } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ── Predefined etiquetas catalog ──────────────────────────────────

export async function fetchEtiquetasPredeterminadas(): Promise<EtiquetaPredeterminadaRecord[]> {
  const { data, error } = await supabase
    .from('catalogo_etiqueta_proyecto_predeterminada')
    .select('id, nombre, descripcion, color_bloque, color_letra')
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Custom etiqueta assignments ───────────────────────────────────

export async function fetchMemberEtiquetasPersonalizadas(
  projectId: number,
): Promise<MemberEtiquetaRecord[]> {
  const { data: catalog, error: catErr } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .select('id')
    .eq('id_proyecto', projectId);

  if (catErr) throw new Error(catErr.message);

  const etiquetaIds = (catalog ?? []).map((e: { id: number }) => e.id);
  if (etiquetaIds.length === 0) return [];

  const { data, error } = await supabase
    .from('etiqueta_proyecto_personalizada')
    .select('id_usuario, id_etiqueta_proyecto_personalizada')
    .in('id_etiqueta_proyecto_personalizada', etiquetaIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assignEtiquetaPersonalizada(
  userId: number,
  etiquetaId: number,
  asignadorId: number,
): Promise<void> {
  const { error } = await supabase
    .from('etiqueta_proyecto_personalizada')
    .insert({
      id_usuario: userId,
      id_etiqueta_proyecto_personalizada: etiquetaId,
      fecha_asignacion: new Date().toISOString(),
      id_asignador: asignadorId,
    });

  if (error) throw new Error(error.message);
}

export async function removeEtiquetaPersonalizada(
  userId: number,
  etiquetaId: number,
): Promise<void> {
  const { error } = await supabase
    .from('etiqueta_proyecto_personalizada')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_etiqueta_proyecto_personalizada', etiquetaId);

  if (error) throw new Error(error.message);
}

// ── Predefined etiqueta assignments ──────────────────────────────

export async function fetchMemberEtiquetasPredeterminadas(
  projectId: number,
): Promise<MemberEtiquetaPredeterminadaRecord[]> {
  const { data, error } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .select('id_usuario, id_etiqueta_proyecto_predeterminada, id_proyecto')
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assignEtiquetaPredeterminada(
  userId: number,
  etiquetaId: number,
  projectId: number,
  asignadorId: number,
): Promise<void> {
  const { error } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .insert({
      id_usuario: userId,
      id_etiqueta_proyecto_predeterminada: etiquetaId,
      id_proyecto: projectId,
      fecha_asignacion: new Date().toISOString(),
      id_asignador: asignadorId,
    });

  if (error) throw new Error(error.message);
}

export async function removeEtiquetaPredeterminada(
  userId: number,
  etiquetaId: number,
  projectId: number,
): Promise<void> {
  const { error } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_etiqueta_proyecto_predeterminada', etiquetaId)
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
}

// ── Etiqueta edit / delete with cascade ──────────────────────────

export async function updateEtiqueta(
  id: number,
  payload: UpdateEtiquetaPayload,
): Promise<EtiquetaPersonalizadaRecord> {
  const { data, error } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .update({
      nombre:       payload.nombre,
      descripcion:  payload.descripcion ?? null,
      color_bloque: payload.color_bloque,
      color_letra:  payload.color_letra,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEtiquetaWithCascade(id: number): Promise<void> {
  // Remove user assignments first to satisfy the FK constraint
  const { error: assignErr } = await supabase
    .from('etiqueta_proyecto_personalizada')
    .delete()
    .eq('id_etiqueta_proyecto_personalizada', id);

  if (assignErr) throw new Error(assignErr.message);

  const { error } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ── Jornada / FTE ─────────────────────────────────────────────────

export async function fetchProjectMembersWithJornada(
  projectId: number,
): Promise<Array<{ id: number; nombre: string | null; apellido: string | null; email: string; jornada: number | null }>> {
  const { data, error } = await supabase
    .from('usuario_proyecto')
    .select('usuario!inner(id, nombre, apellido, email, jornada)')
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);

  type JoinRow = { usuario: { id: number; nombre: string | null; apellido: string | null; email: string; jornada: number | null } };
  return ((data ?? []) as unknown as JoinRow[])
    .map(row => ({
      id:       row.usuario.id,
      nombre:   row.usuario.nombre,
      apellido: row.usuario.apellido,
      email:    row.usuario.email,
      jornada:  row.usuario.jornada,
    }))
    .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
}

export async function fetchProyectoFte(projectId: number): Promise<ProyectoFteRecord[]> {
  const { data, error } = await supabase
    .from('usuario_proyecto_fte')
    .select('id_usuario, id_proyecto, cantidad_horas, fte')
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProyectoFteRecord[];
}

export async function upsertProyectoFte(
  userId: number,
  projectId: number,
  cantidadHoras: number | null,
  jornada: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('usuario_proyecto_fte')
    .upsert(
      {
        id_usuario:     userId,
        id_proyecto:    projectId,
        cantidad_horas: cantidadHoras,
        fte:            jornada && cantidadHoras !== null ? cantidadHoras / jornada : null,
      },
      { onConflict: 'id_usuario,id_proyecto' },
    );

  if (error) throw new Error(error.message);
}

/**
 * Fetches hours each user has committed across all projects EXCEPT excludeProjectId.
 * Returns a map of { userId → totalHours }.
 */
export async function fetchCommittedHoursExcludingProject(
  userIds: number[],
  excludeProjectId: number,
): Promise<Record<number, number>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from('usuario_proyecto_fte')
    .select('id_usuario, cantidad_horas')
    .in('id_usuario', userIds)
    .neq('id_proyecto', excludeProjectId);

  if (error) throw new Error(error.message);

  const totals: Record<number, number> = {};
  for (const row of (data ?? []) as Array<{ id_usuario: number; cantidad_horas: number | null }>) {
    if (row.cantidad_horas != null) {
      totals[row.id_usuario] = (totals[row.id_usuario] ?? 0) + row.cantidad_horas;
    }
  }
  return totals;
}

export function buildFteData(
  members: Array<{ id: number; nombre: string | null; apellido: string | null; email: string; jornada: number | null }>,
  fteEntries: ProyectoFteRecord[],
  committedElsewhere: Record<number, number> = {},
): FteMemberRecord[] {
  const map = new Map(fteEntries.map(f => [f.id_usuario, f]));
  return members.map(m => {
    const horas_otros = committedElsewhere[m.id] ?? 0;
    const max_horas   = m.jornada !== null ? Math.max(0, m.jornada - horas_otros) : null;
    return {
      id:             m.id,
      nombre:         m.nombre,
      apellido:       m.apellido,
      email:          m.email,
      jornada:        m.jornada,
      cantidad_horas: map.get(m.id)?.cantidad_horas ?? null,
      fte:            map.get(m.id)?.fte ?? null,
      horas_otros,
      max_horas,
    };
  });
}