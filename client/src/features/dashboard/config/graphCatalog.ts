// Central catalog of every dashboard graph.
// `id` is the stable key persisted in the DB (usuario_grafica_visibilidad.codigo_grafica)
// and used by the customization panel + render switch. Keep IDs short and stable;
// renaming requires a data migration.

export type GraphVisibility =
  | 'admin-only'   // Only global admins (id_rol_global ∈ {1,2})
  | 'user-only'    // Only on the user dashboard, available to anyone
  | 'shared'       // Available on both dashboards to anyone
  | 'pm-extended'; // Admin graph; non-admins see it on the user dashboard if they PM at least one project

export type DashboardKind = 'admin' | 'user';

export interface GraphDescriptor {
  id:             string;
  label:          string;            // Spanish label shown in the customization panel
  dashboards:     DashboardKind[];   // Which dashboards this graph can appear on
  visibility:     GraphVisibility;
  defaultVisible: boolean;
}

// ── Admin dashboard graphs (current order in AdminDashboard.tsx grid) ───
const ADMIN_GRAPHS: GraphDescriptor[] = [
  { id: 'completion_rate',     label: 'Tasa de completación',     dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'overdue_by_project',  label: 'Ítems vencidos',           dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'backlog_pressure',    label: 'Presión de backlog',       dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'weighted_risk',       label: 'Riesgo ponderado',         dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'segmented_backlog',   label: 'Composición de deuda',     dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'bubble_pressure',     label: 'Tipo de problema (burbuja)', dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'risk_matrix',         label: 'Matriz de riesgo',         dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'project_status_donut',label: 'Estado de proyectos',      dashboards: ['admin'], visibility: 'admin-only',  defaultVisible: true  },
  // item_status_donut is a global aggregate that doesn't filter cleanly per-project — admin-only
  { id: 'item_status_donut',   label: 'Distribución de ítems',    dashboards: ['admin'], visibility: 'admin-only',  defaultVisible: true  },
  { id: 'volume_by_project',   label: 'Volumen de backlog',       dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'fte_by_project',      label: 'FTE asignado',             dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
  { id: 'sprint_health',       label: 'Salud de sprints',         dashboards: ['admin'], visibility: 'pm-extended', defaultVisible: true  },
];

// ── User dashboard graphs (current order in UserDashboard.tsx grid) ─────
const USER_GRAPHS: GraphDescriptor[] = [
  { id: 'personal_overdue',    label: 'Mis ítems vencidos',       dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'personal_upcoming',   label: 'Próximos a vencer',        dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'jornada_fte',         label: 'Carga por proyecto',       dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'personal_status',     label: 'Estado de mis ítems',      dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'hours_by_sprint',     label: 'Horas por sprint',         dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'items_by_type',       label: 'Ítems por tipo',           dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'priority_distribution', label: 'Distribución por prioridad', dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
  { id: 'complexity_hours',    label: 'Horas por complejidad',    dashboards: ['user'], visibility: 'user-only', defaultVisible: true },
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
