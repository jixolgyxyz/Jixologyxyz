// Central catalog of every dashboard graph.
// `id` is the stable key persisted in the DB (usuario_grafica_visibilidad.codigo_grafica)
// and used by the customization panel + render switch. Keep IDs short and stable;
// renaming requires a data migration.

export type GraphVisibility =
  | 'admin-only'   // Only global admins (id_rol_global ∈ {1,2})
  | 'user-only'    // Only on the user dashboard, available to anyone
  | 'shared'       // Available on both dashboards to anyone
  | 'pm-extended'; // Admin graph; non-admins see it on the user dashboard if they PM at least one project

export type DashboardKind = 'admin' | 'user' | 'project';

export type ChartType =
  | 'bar'        // vertical bar chart
  | 'bar-h'      // horizontal bar chart
  | 'donut'      // pie / donut chart
  | 'scatter'    // scatter / dot plot
  | 'bubble'     // bubble chart
  | 'stacked'    // stacked bar chart
  | 'list'       // card list / table
  | 'progress';  // progress bars

export interface GraphDescriptor {
  id:             string;
  label:          string;       // Spanish label shown in the customization panel
  description:    string;       // One-sentence explanation shown in the panel card
  chartType:      ChartType;    // Icon shown in the panel card
  dashboards:     DashboardKind[];
  visibility:     GraphVisibility;
  defaultVisible: boolean;
}

// ── Admin / Project dashboard graphs ────────────────────────────────────
// pm-extended graphs appear on both 'admin' and 'project' dashboards.
// On 'project' they are scoped to the user's PM projects.
const ADMIN_GRAPHS: GraphDescriptor[] = [
  { id: 'completion_rate',      label: 'Tasa de completación',       description: 'Porcentaje de ítems completados sobre el total del backlog por proyecto.',  chartType: 'bar-h',   dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'overdue_by_project',   label: 'Ítems vencidos',             description: 'Cantidad de ítems cuya fecha límite ya pasó, agrupados por proyecto.',       chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'backlog_pressure',     label: 'Presión de backlog',         description: 'Volumen de ítems pendientes ponderado por prioridad y días de atraso.',       chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'weighted_risk',        label: 'Riesgo ponderado',           description: 'Nivel de riesgo de cada proyecto calculado por prioridad y vencimiento.',     chartType: 'bar-h',   dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'segmented_backlog',    label: 'Composición de deuda',       description: 'Desglose del backlog pendiente por tipo de ítem y nivel de complejidad.',     chartType: 'stacked', dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'bubble_pressure',      label: 'Tipo de problema (burbuja)', description: 'Proyectos posicionados por días promedio de atraso, complejidad y volumen.',  chartType: 'bubble',  dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'risk_matrix',          label: 'Matriz de riesgo',           description: 'Distribución de proyectos en una matriz de urgencia versus impacto.',         chartType: 'scatter', dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'project_status_donut', label: 'Estado de proyectos',        description: 'Distribución de todos los proyectos activos según su estado global.',         chartType: 'donut',   dashboards: ['admin'],            visibility: 'admin-only',  defaultVisible: true  },
  { id: 'item_status_donut',    label: 'Distribución de ítems',      description: 'Proporción de todos los ítems del sistema clasificados por estado.',          chartType: 'donut',   dashboards: ['admin'],            visibility: 'admin-only',  defaultVisible: true  },
  { id: 'volume_by_project',    label: 'Volumen de backlog',         description: 'Número total de ítems pendientes en el backlog de cada proyecto.',            chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'fte_by_project',              label: 'FTE asignado',                    description: 'Horas estimadas totales asignadas por proyecto como equivalente FTE.',                         chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'sprint_health',               label: 'Salud de sprints',                description: 'Progreso de ítems completados versus pendientes en sprints activos.',                            chartType: 'progress',dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'estimated_hours_by_project',  label: 'Horas estimadas por proyecto',    description: 'Total de horas estimadas en el backlog completo de cada proyecto.',                             chartType: 'bar-h',   dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'hours_done_vs_pending',       label: 'Horas completadas vs. pendientes',description: 'Horas de ítems terminados frente a ítems pendientes por proyecto.',                             chartType: 'stacked', dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'overdue_hours_by_project',    label: 'Horas en deuda por proyecto',     description: 'Suma de horas estimadas de los ítems vencidos, ponderando el impacto real de la deuda.',        chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'hours_by_priority',           label: 'Horas estimadas por prioridad',   description: 'Distribución del esfuerzo total entre niveles de prioridad (crítica, alta, media, baja).',      chartType: 'bar',     dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'hours_by_item_type',          label: 'Horas estimadas por tipo',        description: 'Proporción del esfuerzo estimado repartido entre historias, tareas, bugs y épicas.',            chartType: 'donut',   dashboards: ['admin', 'project'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'avg_hours_vs_complexity',     label: 'Horas promedio vs. complejidad',  description: 'Scatter por proyecto: horas promedio estimadas versus complejidad promedio de sus ítems.',      chartType: 'scatter', dashboards: ['admin'],            visibility: 'admin-only',  defaultVisible: true  },
];

// ── User dashboard graphs (current order in UserDashboard.tsx grid) ─────
const USER_GRAPHS: GraphDescriptor[] = [
  { id: 'personal_overdue',       label: 'Mis ítems vencidos',          description: 'Lista de los ítems asignados a ti cuya fecha límite ya ha pasado.',         chartType: 'list',    dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'personal_upcoming',      label: 'Próximos a vencer',           description: 'Ítems asignados a ti que vencen dentro de los próximos 7 días.',             chartType: 'list',    dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'jornada_fte',            label: 'Carga por proyecto',          description: 'Horas estimadas por proyecto comparadas con tu jornada semanal disponible.',  chartType: 'progress',dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'personal_status',        label: 'Estado de mis ítems',         description: 'Distribución de todos tus ítems asignados según su estado actual.',          chartType: 'donut',   dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'hours_by_sprint',        label: 'Horas por sprint',            description: 'Total de horas estimadas acumuladas en cada sprint que participas.',          chartType: 'bar',     dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'items_by_type',          label: 'Ítems por tipo',              description: 'Cantidad de ítems que tienes asignados desglosados por tipo de ítem.',        chartType: 'bar',     dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'priority_distribution',  label: 'Distribución por prioridad',  description: 'Proporción de tus ítems asignados según su nivel de prioridad.',             chartType: 'bar-h',   dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'complexity_hours',       label: 'Horas por complejidad',       description: 'Relación entre la complejidad de tus ítems y las horas estimadas en cada uno.',chartType: 'scatter', dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'complexity_time_scatter',   label: 'Estimación vs. complejidad',     description: 'Scatter de tus ítems: horas estimadas por ítem en función de su complejidad individual.',                    chartType: 'scatter', dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'time_accuracy_by_complexity', label: 'Precisión de estimación',      description: 'Compara el tiempo estimado vs. el tiempo real por nivel de complejidad en ítems completados.',               chartType: 'bar',     dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
];

export const GRAPH_CATALOG: GraphDescriptor[] = [...ADMIN_GRAPHS, ...USER_GRAPHS];

export const GRAPH_BY_ID: Record<string, GraphDescriptor> =
  Object.fromEntries(GRAPH_CATALOG.map(g => [g.id, g]));

// Spanish labels for the visibility class badge shown in the panel
export const VISIBILITY_BADGE: Record<GraphVisibility, string> = {
  'admin-only':  'Admin',
  'user-only':   'Personal',
  'shared':      'General',
  'pm-extended': 'PM',
};
