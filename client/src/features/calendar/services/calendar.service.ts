import { supabase } from '@/core/supabase/supabase.client';
import { getProjects } from '@/features/project/projectHub/services/projects.services';
import type { CalendarData, CalendarSprintRecord, CalendarProjectRecord } from '../types/calendar.types';

export async function fetchCalendarData(
  globalRole: number,
  userId: number,
): Promise<CalendarData> {
  const allProjects = await getProjects(globalRole, userId);

  if (allProjects.length === 0) return { sprints: [], projects: [] };

  const projectIds = allProjects.map(p => Number(p.id));
  const projectMap = new Map(allProjects.map(p => [Number(p.id), p.nombre]));
  const projects: CalendarProjectRecord[] = allProjects.map(p => ({
    id: Number(p.id),
    nombre: p.nombre,
  }));

  const { data, error } = await supabase
    .from('sprint')
    .select('id, nombre, objetivo, fecha_inicio, fecha_final, id_proyecto, id_estatus')
    .in('id_proyecto', projectIds)
    .order('fecha_inicio', { ascending: true });

  if (error) throw new Error(error.message);

  const sprints: CalendarSprintRecord[] = (data ?? []).map(sprint => ({
    id: Number(sprint.id),
    nombre: sprint.nombre,
    objetivo: sprint.objetivo,
    fecha_inicio: sprint.fecha_inicio,
    fecha_final: sprint.fecha_final,
    id_proyecto: Number(sprint.id_proyecto),
    id_estatus: sprint.id_estatus,
    project_nombre: projectMap.get(Number(sprint.id_proyecto)) ?? 'Proyecto desconocido',
  }));

  return { sprints, projects };
}
