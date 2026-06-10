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
  const { error, count } = await supabase
    .from('etiqueta_proyecto_personalizada')
    .delete({ count: 'exact' })
    .eq('id_usuario', userId)
    .eq('id_etiqueta_proyecto_personalizada', etiquetaId);

  if (error) throw new Error(error.message);
  if (!count) throw new Error('No tienes permiso para quitar esta etiqueta.');
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
  const { error, count } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .delete({ count: 'exact' })
    .eq('id_usuario', userId)
    .eq('id_etiqueta_proyecto_predeterminada', etiquetaId)
    .eq('id_proyecto', projectId);

  if (error) throw new Error(error.message);
  if (!count) throw new Error('No tienes permiso para quitar esta etiqueta.');
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

// ── Member removal ────────────────────────────────────────────────

export async function removeMemberFromProject(
  userId: number,
  projectId: number,
): Promise<void> {
  // 1. Remove predeterminada etiqueta assignments for this project
  const { error: predErr } = await supabase
    .from('etiqueta_proyecto_predeterminada')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_proyecto', projectId);
  if (predErr) throw new Error(predErr.message);

  // 2. Remove personalizada etiqueta assignments for this project's etiquetas
  const { data: catalog } = await supabase
    .from('catalogo_etiqueta_proyecto_personalizada')
    .select('id')
    .eq('id_proyecto', projectId);
  if (catalog && catalog.length > 0) {
    const { error: custErr } = await supabase
      .from('etiqueta_proyecto_personalizada')
      .delete()
      .eq('id_usuario', userId)
      .in('id_etiqueta_proyecto_personalizada', (catalog as { id: number }[]).map(e => e.id));
    if (custErr) throw new Error(custErr.message);
  }

  // 3. Unassign their backlog items in this project
  const { error: backlogErr } = await supabase
    .from('backlog_item')
    .update({ id_usuario_responsable: null })
    .eq('id_usuario_responsable', userId)
    .eq('id_proyecto', projectId);
  if (backlogErr) throw new Error(backlogErr.message);

  // 4. Remove from the project
  const { error: memberErr } = await supabase
    .from('usuario_proyecto')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_proyecto', projectId);
  if (memberErr) throw new Error(memberErr.message);
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

// ── GitHub integration ────────────────────────────────────────────

export interface GithubConfigRecord {
  id_proyecto: number;
  github_org: string;
  github_repo: string;
  installation_id: number;
  default_branch: string;
}

export async function fetchGithubConfig(projectId: number): Promise<GithubConfigRecord | null> {
  const { data, error } = await supabase
    .from('proyecto_github_config')
    .select('id_proyecto, github_org, github_repo, installation_id, default_branch')
    .eq('id_proyecto', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export function buildGithubInstallUrl(projectId: number, org: string, repo: string): string {
  const state = btoa(JSON.stringify({ projectId, org, repo }));
  const appSlug = import.meta.env.VITE_GITHUB_APP_SLUG as string;
  return `https://github.com/apps/${appSlug}/installations/new?state=${state}`;
}

export interface BranchData {
  branchName: string;
  branchSha: string;
}

export interface BacklogItemGithubRecord {
  branch_name: string | null;
  pr_number: number | null;
  pr_url: string | null;
  pr_status: string | null;
}

export async function fetchBacklogItemGithub(itemId: number): Promise<BacklogItemGithubRecord | null> {
  const { data } = await supabase
    .from('github_backlog_item')
    .select('branch_name, pr_number, pr_url, pr_status')
    .eq('id_backlog_item', itemId)
    .maybeSingle();
  return data;
}

export async function createGithubBranch(
  projectId: number,
  itemId: number,
  itemTitle: string,
  branchName?: string,
): Promise<{ branchName: string }> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github-create-branch`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, itemId, itemTitle, branchName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create branch');
  }
  return res.json() as Promise<{ branchName: string }>;
}

export async function createGithubPR(
  projectId: number,
  itemId: number,
  title: string,
  body?: string,
  baseBranch?: string,
): Promise<{ prNumber: number; prUrl: string }> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github-create-pr`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, itemId, title, body, baseBranch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create PR');
  }
  return res.json() as Promise<{ prNumber: number; prUrl: string }>;
}

export async function fetchProjectBranches(projectId: number): Promise<BranchData[]> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github_get_branches`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error('Failed to fetch branches');
  return res.json() as Promise<BranchData[]>;
}
export interface GithubOrg {
  installation_id: number;
  login: string;
  avatar_url: string;
}

export interface GithubRepo {
  name: string;
  full_name: string;
  private: boolean;
}

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No auth session');
  return `Bearer ${token}`;
}

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');

export class GithubNotConnectedError extends Error {}

export async function fetchGithubUserOrgs(): Promise<GithubOrg[]> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github-user-orgs`, {
    headers: { Authorization: authHeader },
  });
  if (res.status === 404) throw new GithubNotConnectedError();
  if (!res.ok) throw new Error('Failed to fetch GitHub orgs');
  return res.json() as Promise<GithubOrg[]>;
}

export async function fetchGithubInstallationRepos(installationId: number): Promise<GithubRepo[]> {
  const authHeader = await getAuthHeader();
  const res = await fetch(
    `${FUNCTIONS_URL}/functions/v1/github-user-repos?installation_id=${installationId}`,
    { headers: { Authorization: authHeader } },
  );
  if (!res.ok) throw new Error('Failed to fetch GitHub repos');
  return res.json() as Promise<GithubRepo[]>;
}

export async function disconnectGithubProject(projectId: number): Promise<void> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github-project-disconnect`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error('Failed to disconnect GitHub');
}

export async function saveGithubProjectConfig(
  projectId: number,
  org: string,
  repo: string,
  installationId: number,
  defaultBranch: string = 'main',
): Promise<void> {
  const { error } = await supabase
    .from('proyecto_github_config')
    .upsert(
      { id_proyecto: projectId, github_org: org, github_repo: repo, installation_id: installationId, default_branch: defaultBranch },
      { onConflict: 'id_proyecto' },
    );
  if (error) throw new Error(error.message);
}

export async function updateGithubDefaultBranch(projectId: number, branch: string): Promise<void> {
  const { error } = await supabase
    .from('proyecto_github_config')
    .update({ default_branch: branch })
    .eq('id_proyecto', projectId);
  if (error) throw new Error(error.message);
}

export async function deleteGithubBranch(projectId: number, itemId: number): Promise<void>{
  const authHeader = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/functions/v1/github-delete-branch`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify ({projectId, itemId}), 
  });

  if (!res.ok) throw new Error('Failed to delete branch')
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