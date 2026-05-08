import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/core/auth/userContext';
import { fetchUserAssignedItems, fetchAllSprints, fetchUserJornadaFte, fetchAllProjects } from '../services/dashboard.service';
import type { UserJornadaFte, ProjectRecord } from '../services/dashboard.service';
import {
  fetchBacklogStatuses,
  fetchBacklogPriorities,
  fetchBacklogTypes,
} from '@/features/project/Backlog/services/backlog.service';
import type {
  BacklogItemRecord,
  BacklogStatusRecord,
  BacklogPriorityRecord,
  BacklogTypeRecord,
  SprintRecord,
} from '@/features/project/Backlog/types/backlog.types';

export interface StatusSlice   { name: string; value: number; color: string }
export interface SprintGroupRow { sprint: string; [projectName: string]: number | string }
export interface SprintHoursData {
  rows:     SprintGroupRow[];
  projects: { name: string; color: string }[];
  total:    number;
}
export interface TypeCount     { tipo: string; count: number }
export interface PriorityCount { prioridad: string; count: number; color: string }
export interface ComplexityBar  { complejidad: number; horas: number; count: number }

export interface DashboardData {
  totalItems:         number;
  itemsWithEstimate:  number;
  statusData:         StatusSlice[];
  sprintHours:        SprintHoursData;
  typeData:           TypeCount[];
  priorityData:       PriorityCount[];
  complexityData:     ComplexityBar[];
  overdueItems:       BacklogItemRecord[];
  upcomingItems:      BacklogItemRecord[];
  jornadaFte:         UserJornadaFte;
}

const STATUS_PALETTE = [
  '#0A0838', '#E31837', '#3b82f6', '#f59e0b',
  '#10b981', '#8b5cf6', '#ec4899', '#6b7280',
];

const PRIORITY_COLORS: Record<string, string> = {
  'Crítica': '#E31837',
  'Alta':    '#f97316',
  'Media':   '#6b7280',
  'Baja':    '#3b82f6',
  'Mínima':  '#1d4ed8',
};

function buildStatusData(
  items: BacklogItemRecord[],
  statuses: BacklogStatusRecord[],
): StatusSlice[] {
  const statusMap = new Map(statuses.map(s => [s.id, s.nombre]));
  const counts = new Map<number, number>();
  for (const item of items) {
    counts.set(item.id_estatus, (counts.get(item.id_estatus) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([id, value], i) => ({
    name:  statusMap.get(id) ?? `Estado ${id}`,
    value,
    color: STATUS_PALETTE[i % STATUS_PALETTE.length],
  }));
}

const PROJECT_COLORS = ['#3b82f6', '#f59e0b', '#E31837', '#10b981', '#8b5cf6', '#0A0838'];

function buildSprintHours(
  items: BacklogItemRecord[],
  sprints: SprintRecord[],
  projects: ProjectRecord[],
): SprintHoursData {
  const projectMap  = new Map(projects.map(p => [p.id, p.nombre]));
  const sprintInfo  = new Map(sprints.map(s => [s.id, { nombre: s.nombre, id_proyecto: s.id_proyecto }]));

  // sprintName → projectName → hours
  const hoursMap = new Map<string, Map<string, number>>();

  for (const item of items) {
    if (item.id_sprint == null) continue;
    const info = sprintInfo.get(item.id_sprint);
    if (!info) continue;
    const sprintName   = info.nombre;
    const projectName  = projectMap.get(info.id_proyecto) ?? `Proyecto ${info.id_proyecto}`;
    const h            = (item.tiempo ?? 0) / 60;

    if (!hoursMap.has(sprintName)) hoursMap.set(sprintName, new Map());
    const pm = hoursMap.get(sprintName)!;
    pm.set(projectName, (pm.get(projectName) ?? 0) + h);
  }

  const sprintNames = Array.from(hoursMap.keys()).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  const seenProjects = new Set<string>();
  for (const p of projects) {
    const name = projectMap.get(p.id);
    if (name && Array.from(hoursMap.values()).some(m => m.has(name))) {
      seenProjects.add(name);
    }
  }

  const projectList = Array.from(seenProjects).map((name, i) => ({
    name,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));

  const rows: SprintGroupRow[] = sprintNames.map(sprint => {
    const row: SprintGroupRow = { sprint };
    const pm = hoursMap.get(sprint)!;
    for (const [projectName, h] of pm.entries()) {
      row[projectName] = Math.round(h * 10) / 10;
    }
    return row;
  });

  const total = Math.round(
    Array.from(hoursMap.values())
      .flatMap(m => Array.from(m.values()))
      .reduce((acc, h) => acc + h, 0) * 10
  ) / 10;

  return { rows, projects: projectList, total };
}

function buildTypeData(
  items: BacklogItemRecord[],
  types: BacklogTypeRecord[],
): TypeCount[] {
  const typeMap = new Map(types.map(t => [t.id, t.nombre]));
  const counts = new Map<number, number>();
  for (const item of items) {
    if (item.id_tipo == null) continue;
    counts.set(item.id_tipo, (counts.get(item.id_tipo) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({ tipo: typeMap.get(id) ?? `Tipo ${id}`, count }))
    .sort((a, b) => b.count - a.count);
}

function buildPriorityData(
  items: BacklogItemRecord[],
  priorities: BacklogPriorityRecord[],
): PriorityCount[] {
  const priorityMap = new Map(priorities.map(p => [p.id, p.nombre]));
  const counts = new Map<number, number>();
  for (const item of items) {
    if (item.id_prioridad == null) continue;
    counts.set(item.id_prioridad, (counts.get(item.id_prioridad) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([id, count]) => {
    const nombre = priorityMap.get(id) ?? `Prioridad ${id}`;
    return { prioridad: nombre, count, color: PRIORITY_COLORS[nombre] ?? '#6b7280' };
  });
}

function buildComplexityData(items: BacklogItemRecord[]): ComplexityBar[] {
  const hoursMap = new Map<number, number>();
  const countMap = new Map<number, number>();

  for (const item of items) {
    if (item.complejidad == null) continue;
    hoursMap.set(item.complejidad, (hoursMap.get(item.complejidad) ?? 0) + (item.tiempo != null ? item.tiempo / 60 : 0));
    countMap.set(item.complejidad, (countMap.get(item.complejidad) ?? 0) + 1);
  }

  return [1, 2, 3, 4, 5].map(c => ({
    complejidad: c,
    horas:       Math.round((hoursMap.get(c) ?? 0) * 10) / 10,
    count:       countMap.get(c) ?? 0,
  }));
}

function buildUpcomingItems(
  items: BacklogItemRecord[],
  statuses: BacklogStatusRecord[],
): BacklogItemRecord[] {
  const terminalIds = new Set(statuses.filter(s => s.es_terminal).map(s => s.id));
  const today = new Date().toISOString().split('T')[0];
  return items
    .filter(
      item =>
        item.fecha_vencimiento !== null &&
        item.fecha_vencimiento >= today &&
        !terminalIds.has(item.id_estatus),
    )
    .sort((a, b) => (a.fecha_vencimiento! < b.fecha_vencimiento! ? -1 : 1));
}

function buildOverdueItems(
  items: BacklogItemRecord[],
  statuses: BacklogStatusRecord[],
): BacklogItemRecord[] {
  const terminalIds = new Set(statuses.filter(s => s.es_terminal).map(s => s.id));
  const today = new Date().toISOString().split('T')[0];
  return items.filter(
    item =>
      item.fecha_vencimiento !== null &&
      item.fecha_vencimiento < today &&
      !terminalIds.has(item.id_estatus),
  );
}

// ── Raw fetched data (never filtered) ─────────────────────────────────
interface RawData {
  allItems:    BacklogItemRecord[];
  statuses:    BacklogStatusRecord[];
  priorities:  BacklogPriorityRecord[];
  types:       BacklogTypeRecord[];
  sprints:     SprintRecord[];
  jornadaFte:  UserJornadaFte;
  projects:    ProjectRecord[];
}

export interface UserDashboardDataResult {
  data:     DashboardData | null;
  projects: ProjectRecord[];
  loading:  boolean;
  error:    string | null;
}

export function useUserDashboardData(selectedProjectIds: number[] | null): UserDashboardDataResult {
  const { user, loading: userLoading } = useUser();
  const [raw, setRaw]       = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !user) return;

    let isMounted = true;

    Promise.all([
      fetchUserAssignedItems(user.id),
      fetchBacklogStatuses(),
      fetchBacklogPriorities(),
      fetchBacklogTypes(),
      fetchAllSprints(),
      fetchUserJornadaFte(user.id),
      fetchAllProjects(),
    ])
      .then(([allItems, statuses, priorities, types, sprints, jornadaFte, projects]) => {
        if (!isMounted) return;
        setRaw({ allItems, statuses, priorities, types, sprints, jornadaFte, projects });
        setError(null);
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [user, userLoading]);

  // Apply project filter on the client — no extra network calls needed
  const data = useMemo<DashboardData | null>(() => {
    if (!raw) return null;

    const { allItems, statuses, priorities, types, sprints, jornadaFte, projects } = raw;

    const filterSet = selectedProjectIds && selectedProjectIds.length > 0
      ? new Set(selectedProjectIds)
      : null;

    const items = filterSet
      ? allItems.filter(i => filterSet.has(i.id_proyecto))
      : allItems;

    const filteredJornadaFte: UserJornadaFte = filterSet
      ? { ...jornadaFte, rows: jornadaFte.rows.filter(r => filterSet.has(r.id_proyecto)) }
      : jornadaFte;

    // Only pass projects that are relevant to the current filter
    const visibleProjects = filterSet
      ? projects.filter(p => filterSet.has(p.id))
      : projects;

    return {
      totalItems:        items.length,
      itemsWithEstimate: items.filter(i => i.complejidad != null && i.tiempo != null).length,
      statusData:        buildStatusData(items, statuses),
      sprintHours:       buildSprintHours(items, sprints, visibleProjects),
      typeData:          buildTypeData(items, types),
      priorityData:      buildPriorityData(items, priorities),
      complexityData:    buildComplexityData(items),
      overdueItems:      buildOverdueItems(items, statuses),
      upcomingItems:     buildUpcomingItems(items, statuses),
      jornadaFte:        filteredJornadaFte,
    };
  }, [raw, selectedProjectIds]);

  return { data, projects: raw?.projects ?? [], loading, error };
}
