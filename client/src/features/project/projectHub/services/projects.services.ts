import { supabase } from '@/core/supabase/supabase.client';
import { hasAdminRole } from '@/core/auth/user.service';

// --- Tipos ---
import type { Project } from '../types/Project';

// Interfaz para contexto de Projctos.
export type ProjectContextData = Pick<Project,
  | 'id'
  | 'nombre'
  | 'cliente'
  | 'id_estatus'
> & {
  metodologia: string;
};

export async function getProjects(globalRole: number, userId: number): Promise<Project[]> {
  if (globalRole === 1 || globalRole === 2) {
    const { data, error } = await supabase
      .from('project_card_view')
      .select('*')
      .neq('id_estatus', 5);

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('project_card_view')
    .select('*, usuario_proyecto!inner(id_usuario)')
    .eq('usuario_proyecto.id_usuario', userId)
    .neq('id_estatus', 5);

  if (error) throw new Error(error.message);
  return data;
}

export async function getArchivedProjects(globalRole: number, userId: number): Promise<Project[]> {
  if (globalRole === 1 || globalRole === 2) {
    const { data, error } = await supabase
      .from('project_card_view')
      .select('*')
      .eq('id_estatus', 5);

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('project_card_view')
    .select('*, usuario_proyecto!inner(id_usuario)')
    .eq('usuario_proyecto.id_usuario', userId)
    .eq('id_estatus', 5);

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchProjectContext(projectId: number): Promise<ProjectContextData> {
  const { data, error } = await supabase
                                  .from('proyecto')
                                  .select('id, nombre, cliente, id_estatus, metodologia_proyecto!inner(nombre)')
                                  .eq('id', projectId)
                                  .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    nombre: data.nombre,
    cliente: data.cliente,
    id_estatus: data.id_estatus,
    metodologia: Array.isArray(data.metodologia_proyecto)
    ? data.metodologia_proyecto[0].nombre
    : (data.metodologia_proyecto as {nombre : string }).nombre,
  };
}

export async function changeProjectStatus(projectId: number, userId: number, newStatus: number): Promise<void> {
  if (!await hasAdminRole(userId)){
    throw { message: "No tienes permiso de modificar", status: 401 };
  }

  const { error } = await supabase
                          .from('proyecto')
                          .update({ id_estatus: newStatus })
                          .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function archiveProject(projectId: number, userId: number): Promise<void> {
  if (!await hasAdminRole(userId)){
    throw { message: "No tienes permiso de modificar", status: 401 };
  }

  const { error } = await supabase
                          .from('proyecto')
                          .update({ id_estatus: 5 })
                          .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function unarchiveProject(projectId: number, userId: number): Promise<void> {
  if (!await hasAdminRole(userId)){
    throw { message: "No tienes permiso de modificar", status: 401 };
  }

  const { error } = await supabase
                          .from('proyecto')
                          .update({ id_estatus: 4 })
                          .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function fetchAllProyectData(projectId: number): Promise<Project> {
    const [{ data, error }, { data: cardData, error: cardError }] = await Promise.all([
      supabase.from('proyecto').select('*').eq('id', projectId).single(),
      supabase.from('project_card_view').select('total_backlog_items, completed_backlog_items, completion_percentage').eq('id', projectId).single(),
    ]);

    if (error) throw new Error(error.message);
    if (cardError) throw new Error(cardError.message);

    return { ...data, ...cardData } as Project;
}

