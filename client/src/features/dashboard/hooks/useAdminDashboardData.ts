import { useState, useEffect, useMemo } from 'react';
import {
  fetchAdminProjects,
  fetchAdminItems,
  fetchAdminSprints,
  fetchAdminFte,
  fetchAdminCompletion,
  fetchAdminWeeklyItems,
  type AdminProjectRow,
  type AdminItemRow,
  type AdminSprintRow,
  type AdminFteRow,
  type AdminCompletionRow,
  type AdminWeeklyItemRow,
} from '../services/admin.dashboard.service';

export interface ProjectStatusSlice    { name: string; value: number; color: string }
export interface ProjectCompletionRow  { id: number; name: string; done: number; total: number; rate: number }
export interface ProjectVolumeRow      { id: number; name: string; count: number }
export interface GlobalItemStatusSlice { name: string; value: number; color: string }
export interface SprintHealthRow       { id: number; name: string; active: number; terminal: number }
export interface FteProjectRow         { id: number; name: string; fte: number }
export interface OverdueProjectRow     { id: number; name: string; overdue: number }
export interface BacklogItemDetail  { days: number; complejidad: number }
export interface BacklogPressureRow {
  id:            number;
  name:          string;
  debtDays:      number;
  complexitySum: number;
  weightedScore: number;   // Σ(days × complejidad)
  count:         number;
  avgDays:       number;
  avgComplexity: number;
  items:         BacklogItemDetail[];
}

export interface WeeklyProjectRow   { name: string; completed: number; total: number; rate: number }
export interface WeeklyProgressData { completed: number; total: number; rate: number; byProject: WeeklyProjectRow[] }

export interface EstimatedHoursProjectRow { id: number; name: string; hours: number }
export interface HoursDonePendingRow      { id: number; name: string; done: number; pending: number }
export interface OverdueHoursProjectRow   { id: number; name: string; hours: number }
export interface HoursByPriorityRow       { prioridad: string; hours: number; color: string }
export interface HoursByTypeRow           { tipo: string; hours: number; color: string }
export interface AvgHoursComplexityRow    { id: number; name: string; avgHours: number; avgComplexity: number; count: number }

export interface AdminDashboardData {
  activeProjects:          number;
  totalItems:              number;
  weeklyProgress:          WeeklyProgressData;
  projectStatus:           ProjectStatusSlice[];
  completionByProject:     ProjectCompletionRow[];
  volumeByProject:         ProjectVolumeRow[];
  globalItemStatus:        GlobalItemStatusSlice[];
  sprintHealth:            SprintHealthRow[];
  fteByProject:            FteProjectRow[];
  overdueByProject:        OverdueProjectRow[];
  backlogPressure:         BacklogPressureRow[];
  estimatedHoursByProject: EstimatedHoursProjectRow[];
  hoursDonePending:        HoursDonePendingRow[];
  overdueHoursByProject:   OverdueHoursProjectRow[];
  hoursByPriority:         HoursByPriorityRow[];
  hoursByType:             HoursByTypeRow[];
  avgHoursVsComplexity:    AvgHoursComplexityRow[];
}

export interface AdminDashboardResult {
  data:    AdminDashboardData | null;
  loading: boolean;
  error:   string | null;
}

interface RawData {
  projects:    AdminProjectRow[];
  items:       AdminItemRow[];
  sprints:     AdminSprintRow[];
  fte:         AdminFteRow[];
  completion:  AdminCompletionRow[];
  weeklyItems: AdminWeeklyItemRow[];
}

const PROJECT_STATUS_PALETTE = ['#0A0838', '#3b82f6', '#10b981', '#f59e0b', '#E31837', '#8b5cf6'];
const PRIORITY_COLORS: Record<string, string> = {
  'Crítica': '#E31837', 'Alta': '#f97316', 'Media': '#6b7280', 'Baja': '#3b82f6', 'Mínima': '#1d4ed8',
};
const TYPE_PALETTE = ['#0A0838', '#3b82f6', '#10b981', '#f59e0b', '#E31837', '#8b5cf6', '#ec4899'];
const ITEM_STATUS_PALETTE    = ['#0A0838', '#3b82f6', '#f59e0b', '#10b981', '#E31837', '#8b5cf6', '#6b7280'];

export function useAdminDashboardData(): AdminDashboardResult {
  const [raw, setRaw]         = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchAdminProjects(),
      fetchAdminItems(),
      fetchAdminSprints(),
      fetchAdminFte(),
      fetchAdminCompletion(),
      fetchAdminWeeklyItems(),
    ])
      .then(([projects, items, sprints, fte, completion, weeklyItems]) => {
        if (!mounted) return;
        setRaw({ projects, items, sprints, fte, completion, weeklyItems });
        setError(null);
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const data = useMemo<AdminDashboardData | null>(() => {
    if (!raw) return null;
    const { projects, items, sprints, fte, completion, weeklyItems } = raw;

    const projectMap = new Map(projects.map(p => [p.id, p.nombre]));

    // ── Stat cards ───────────────────────────────────────────────────────
    const activeProjects   = projects.filter(p => !p.isTerminal).length;
    const totalItems       = items.length;
    const weeklyTotal     = weeklyItems.length;
    const weeklyCompleted = weeklyItems.filter(i => i.isTerminal).length;
    const weeklyRate      = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

    const weeklyByProjectMap = new Map<number, { completed: number; total: number }>();
    for (const item of weeklyItems) {
      if (!weeklyByProjectMap.has(item.id_proyecto)) weeklyByProjectMap.set(item.id_proyecto, { completed: 0, total: 0 });
      const bucket = weeklyByProjectMap.get(item.id_proyecto)!;
      bucket.total++;
      if (item.isTerminal) bucket.completed++;
    }
    const weeklyByProject: WeeklyProjectRow[] = Array.from(weeklyByProjectMap.entries())
      .map(([id, b]) => ({
        name:      projectMap.get(id) ?? `Proyecto ${id}`,
        completed: b.completed,
        total:     b.total,
        rate:      Math.round((b.completed / b.total) * 100),
      }))
      .sort((a, b) => b.total - a.total);

    const weeklyProgress: WeeklyProgressData = {
      completed: weeklyCompleted, total: weeklyTotal, rate: weeklyRate, byProject: weeklyByProject,
    };

    // ── Project status distribution ──────────────────────────────────────
    const statusCounts = new Map<string, number>();
    for (const p of projects) {
      statusCounts.set(p.statusName, (statusCounts.get(p.statusName) ?? 0) + 1);
    }
    const projectStatus: ProjectStatusSlice[] = Array.from(statusCounts.entries()).map(
      ([name, value], i) => ({ name, value, color: PROJECT_STATUS_PALETTE[i % PROJECT_STATUS_PALETTE.length] }),
    );

    // ── Completion per project — from project_card_view ──────────────────
    const completionByProject: ProjectCompletionRow[] = completion
      .map(r => ({
        id:    r.id,
        name:  r.nombre,
        done:  r.completed_backlog_items,
        total: r.total_backlog_items,
        rate:  Math.round(r.completion_percentage),
      }))
      .sort((a, b) => b.rate - a.rate);

    // ── Per-project item buckets (for volume + global status charts) ──────
    const itemsByProject = new Map<number, AdminItemRow[]>();
    for (const item of items) {
      if (!itemsByProject.has(item.id_proyecto)) itemsByProject.set(item.id_proyecto, []);
      itemsByProject.get(item.id_proyecto)!.push(item);
    }

    const volumeByProject: ProjectVolumeRow[] = Array.from(itemsByProject.entries())
      .map(([id, pItems]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, count: pItems.length }))
      .sort((a, b) => b.count - a.count);

    // ── Global item status distribution ─────────────────────────────────
    const globalCounts = new Map<string, number>();
    for (const item of items) {
      globalCounts.set(item.statusName, (globalCounts.get(item.statusName) ?? 0) + 1);
    }
    const globalItemStatus: GlobalItemStatusSlice[] = Array.from(globalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: ITEM_STATUS_PALETTE[i % ITEM_STATUS_PALETTE.length] }));

    // ── Sprint health per project ────────────────────────────────────────
    const sprintBuckets = new Map<number, { active: number; terminal: number }>();
    for (const sprint of sprints) {
      if (!sprintBuckets.has(sprint.id_proyecto)) sprintBuckets.set(sprint.id_proyecto, { active: 0, terminal: 0 });
      const bucket = sprintBuckets.get(sprint.id_proyecto)!;
      if (sprint.isTerminal) bucket.terminal++;
      else bucket.active++;
    }
    const sprintHealth: SprintHealthRow[] = Array.from(sprintBuckets.entries())
      .map(([id, counts]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, ...counts }))
      .sort((a, b) => (b.active + b.terminal) - (a.active + a.terminal));

    // ── FTE by project — seed every project at 0 so all appear ──────────
    // Effective FTE = stored fte column, or fallback to cantidad_horas / jornada
    // (mirrors the JornadaFteCard fallback so missing-jornada users still count)
    const fteAccum = new Map<number, number>(projects.map(p => [p.id, 0]));
    for (const row of fte) {
      const effectiveFte = row.fte ?? (
        row.jornada && row.jornada > 0 && row.cantidad_horas != null
          ? row.cantidad_horas / row.jornada
          : null
      );
      if (effectiveFte == null) continue;
      fteAccum.set(row.id_proyecto, (fteAccum.get(row.id_proyecto) ?? 0) + effectiveFte);
    }
    const fteByProject: FteProjectRow[] = Array.from(fteAccum.entries())
      .map(([id, fteVal]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, fte: Math.round(fteVal * 100) / 100 }))
      .sort((a, b) => b.fte - a.fte);

    // ── Overdue items per project ────────────────────────────────────────
    const now     = new Date();
    const nowIso  = now.toISOString();
    const overdueAccum = new Map<number, number>(projects.map(p => [p.id, 0]));
    for (const item of items) {
      if (!item.isTerminal && item.fecha_vencimiento && item.fecha_vencimiento < nowIso) {
        overdueAccum.set(item.id_proyecto, (overdueAccum.get(item.id_proyecto) ?? 0) + 1);
      }
    }
    const overdueByProject: OverdueProjectRow[] = Array.from(overdueAccum.entries())
      .filter(([, count]) => count > 0)
      .map(([id, overdue]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, overdue }))
      .sort((a, b) => b.overdue - a.overdue);

    // ── Backlog pressure per project ─────────────────────────────────────
    // debtDays = Σ(days overdue), complexitySum = Σ(complejidad),
    // weightedScore = Σ(days × complejidad) — captures both dimensions
    const pressureAccum = new Map<number, {
      debtDays: number; complexitySum: number; weightedScore: number; items: BacklogItemDetail[];
    }>();
    for (const item of items) {
      if (!item.isTerminal && item.fecha_vencimiento) {
        const due = new Date(item.fecha_vencimiento);
        if (due < now) {
          const days  = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
          const compl = item.complejidad ?? 0;
          if (!pressureAccum.has(item.id_proyecto)) {
            pressureAccum.set(item.id_proyecto, { debtDays: 0, complexitySum: 0, weightedScore: 0, items: [] });
          }
          const b = pressureAccum.get(item.id_proyecto)!;
          b.debtDays      += days;
          b.complexitySum += compl;
          b.weightedScore += days * compl;
          b.items.push({ days, complejidad: compl });
        }
      }
    }
    const backlogPressure: BacklogPressureRow[] = Array.from(pressureAccum.entries())
      .filter(([, v]) => v.debtDays > 0)
      .map(([id, v]) => ({
        id,
        name:          projectMap.get(id) ?? `Proyecto ${id}`,
        debtDays:      v.debtDays,
        complexitySum: v.complexitySum,
        weightedScore: v.weightedScore,
        count:         v.items.length,
        avgDays:       Math.round(v.debtDays / v.items.length),
        avgComplexity: Math.round((v.complexitySum / v.items.length) * 10) / 10,
        items:         v.items,
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // ── Estimated hours per project ──────────────────────────────────────
    const estHoursAccum = new Map<number, number>(projects.map(p => [p.id, 0]));
    for (const item of items) {
      if (item.tiempo != null) {
        estHoursAccum.set(item.id_proyecto, (estHoursAccum.get(item.id_proyecto) ?? 0) + item.tiempo / 60);
      }
    }
    const estimatedHoursByProject: EstimatedHoursProjectRow[] = Array.from(estHoursAccum.entries())
      .map(([id, hours]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);

    // ── Hours done vs. pending per project ───────────────────────────────
    const donePendingAccum = new Map<number, { done: number; pending: number }>(
      projects.map(p => [p.id, { done: 0, pending: 0 }]),
    );
    for (const item of items) {
      if (item.tiempo != null) {
        const b = donePendingAccum.get(item.id_proyecto)!;
        if (item.isTerminal) b.done    += item.tiempo / 60;
        else                 b.pending += item.tiempo / 60;
      }
    }
    const hoursDonePending: HoursDonePendingRow[] = Array.from(donePendingAccum.entries())
      .map(([id, v]) => ({
        id,
        name:    projectMap.get(id) ?? `Proyecto ${id}`,
        done:    Math.round(v.done    * 10) / 10,
        pending: Math.round(v.pending * 10) / 10,
      }))
      .sort((a, b) => (b.done + b.pending) - (a.done + a.pending));

    // ── Overdue hours per project ─────────────────────────────────────────
    const overdueHoursAccum = new Map<number, number>(projects.map(p => [p.id, 0]));
    for (const item of items) {
      if (!item.isTerminal && item.fecha_vencimiento && item.fecha_vencimiento < nowIso && item.tiempo != null) {
        overdueHoursAccum.set(item.id_proyecto, (overdueHoursAccum.get(item.id_proyecto) ?? 0) + item.tiempo / 60);
      }
    }
    const overdueHoursByProject: OverdueHoursProjectRow[] = Array.from(overdueHoursAccum.entries())
      .filter(([, h]) => h > 0)
      .map(([id, hours]) => ({ id, name: projectMap.get(id) ?? `Proyecto ${id}`, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);

    // ── Hours by priority ─────────────────────────────────────────────────
    const priorityHoursMap = new Map<string, number>();
    for (const item of items) {
      if (item.priorityName && item.tiempo != null) {
        priorityHoursMap.set(item.priorityName, (priorityHoursMap.get(item.priorityName) ?? 0) + item.tiempo / 60);
      }
    }
    const hoursByPriority: HoursByPriorityRow[] = Array.from(priorityHoursMap.entries())
      .map(([prioridad, hours]) => ({ prioridad, hours: Math.round(hours * 10) / 10, color: PRIORITY_COLORS[prioridad] ?? '#6b7280' }))
      .sort((a, b) => b.hours - a.hours);

    // ── Hours by item type ────────────────────────────────────────────────
    const typeHoursMap = new Map<string, number>();
    for (const item of items) {
      if (item.typeName && item.tiempo != null) {
        typeHoursMap.set(item.typeName, (typeHoursMap.get(item.typeName) ?? 0) + item.tiempo / 60);
      }
    }
    const hoursByType: HoursByTypeRow[] = Array.from(typeHoursMap.entries())
      .map(([tipo, hours], i) => ({ tipo, hours: Math.round(hours * 10) / 10, color: TYPE_PALETTE[i % TYPE_PALETTE.length] }))
      .sort((a, b) => b.hours - a.hours);

    // ── Avg hours vs. avg complexity per project ──────────────────────────
    const complexHoursAccum = new Map<number, { totalHours: number; totalComplexity: number; count: number }>();
    for (const item of items) {
      if (!item.isTerminal && item.tiempo != null && item.complejidad != null) {
        if (!complexHoursAccum.has(item.id_proyecto)) {
          complexHoursAccum.set(item.id_proyecto, { totalHours: 0, totalComplexity: 0, count: 0 });
        }
        const b = complexHoursAccum.get(item.id_proyecto)!;
        b.totalHours      += item.tiempo / 60;
        b.totalComplexity += item.complejidad;
        b.count++;
      }
    }
    const avgHoursVsComplexity: AvgHoursComplexityRow[] = Array.from(complexHoursAccum.entries())
      .filter(([, v]) => v.count > 0)
      .map(([id, v]) => ({
        id,
        name:          projectMap.get(id) ?? `Proyecto ${id}`,
        avgHours:      Math.round((v.totalHours      / v.count) * 10) / 10,
        avgComplexity: Math.round((v.totalComplexity / v.count) * 10) / 10,
        count:         v.count,
      }));

    return {
      activeProjects, totalItems, weeklyProgress,
      projectStatus, completionByProject, volumeByProject,
      globalItemStatus, sprintHealth, fteByProject, overdueByProject,
      backlogPressure,
      estimatedHoursByProject, hoursDonePending, overdueHoursByProject,
      hoursByPriority, hoursByType, avgHoursVsComplexity,
    };
  }, [raw]);

  return { data, loading, error };
}
