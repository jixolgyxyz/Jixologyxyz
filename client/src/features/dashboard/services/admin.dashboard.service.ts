import { supabase } from '@/core/supabase/supabase.client';

// ── Raw DB shapes ──────────────────────────────────────────────────────────

export interface AdminProjectRow {
  id:             number;
  nombre:         string;
  id_estatus:     number;
  statusName:     string;
  isTerminal:     boolean;
}

export interface AdminItemRow {
  id:                number;
  id_proyecto:       number;
  id_estatus:        number;
  statusName:        string;
  statusOrden:       number;
  isTerminal:        boolean;
  fecha_vencimiento: string | null;
}

export interface AdminSprintRow {
  id:             number;
  id_proyecto:    number;
  isTerminal:     boolean;
}

export interface AdminCompletionRow {
  id:                    number;
  nombre:                string;
  total_backlog_items:   number;
  completed_backlog_items: number;
  completion_percentage: number;
}

export interface AdminFteRow {
  id_proyecto:    number;
  fte:            number | null;       // stored value (may be null if jornada was unset)
  cantidad_horas: number | null;
  jornada:        number | null;       // user's weekly hours — used to derive fte when stored value is null
}

// ── Fetchers ───────────────────────────────────────────────────────────────

export async function fetchAdminProjects(): Promise<AdminProjectRow[]> {
  const { data, error } = await supabase
    .from('proyecto')
    .select('id, nombre, id_estatus, estatus_proyecto(nombre, es_terminal)')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => {
    const s = r.estatus_proyecto as unknown as { nombre: string; es_terminal: boolean } | null;
    return {
      id:         r.id,
      nombre:     r.nombre,
      id_estatus: r.id_estatus,
      statusName: s?.nombre     ?? 'Desconocido',
      isTerminal: s?.es_terminal ?? false,
    };
  });
}

export async function fetchAdminItems(): Promise<AdminItemRow[]> {
  const { data, error } = await supabase
    .from('backlog_item')
    .select('id, id_proyecto, id_estatus, fecha_vencimiento, estatus_backlog_item(nombre, es_terminal, orden)');

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => {
    const s = r.estatus_backlog_item as unknown as
      { nombre: string; es_terminal: boolean; orden: number } | null;
    return {
      id:                r.id,
      id_proyecto:       r.id_proyecto,
      id_estatus:        r.id_estatus,
      statusName:        s?.nombre      ?? 'Desconocido',
      statusOrden:       s?.orden       ?? 99,
      isTerminal:        s?.es_terminal ?? false,
      fecha_vencimiento: r.fecha_vencimiento ?? null,
    };
  });
}

export async function fetchAdminSprints(): Promise<AdminSprintRow[]> {
  const { data, error } = await supabase
    .from('sprint')
    .select('id, id_proyecto, estatus_sprint(es_terminal)');

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => {
    const s = r.estatus_sprint as unknown as { es_terminal: boolean } | null;
    return {
      id:          r.id,
      id_proyecto: r.id_proyecto,
      isTerminal:  s?.es_terminal ?? false,
    };
  });
}

export async function fetchAdminCompletion(): Promise<AdminCompletionRow[]> {
  const { data, error } = await supabase
    .from('project_card_view')
    .select('id, nombre, total_backlog_items, completed_backlog_items, completion_percentage')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => ({
    id:                      r.id,
    nombre:                  r.nombre,
    total_backlog_items:     r.total_backlog_items     ?? 0,
    completed_backlog_items: r.completed_backlog_items ?? 0,
    completion_percentage:   r.completion_percentage   ?? 0,
  }));
}

export interface AdminWeeklyItemRow {
  id:          number;
  id_proyecto: number;
  isTerminal:  boolean;
}

export async function fetchAdminWeeklyItems(): Promise<AdminWeeklyItemRow[]> {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('backlog_item')
    .select('id, id_proyecto, id_estatus, estatus_backlog_item(es_terminal)')
    .gte('fecha_vencimiento', monday.toISOString())
    .lte('fecha_vencimiento', friday.toISOString());

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => {
    const s = r.estatus_backlog_item as unknown as { es_terminal: boolean } | null;
    return { id: r.id, id_proyecto: r.id_proyecto, isTerminal: s?.es_terminal ?? false };
  });
}

export async function fetchAdminFte(): Promise<AdminFteRow[]> {
  const { data, error } = await supabase
    .from('usuario_proyecto_fte')
    .select('id_proyecto, fte, cantidad_horas, usuario(jornada)');

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => {
    const u = r.usuario as unknown as { jornada: number | null } | null;
    return {
      id_proyecto:    r.id_proyecto,
      fte:            r.fte ?? null,
      cantidad_horas: r.cantidad_horas ?? null,
      jornada:        u?.jornada ?? null,
    };
  });
}
