export interface CalendarSprintRecord {
  id: number;
  nombre: string;
  objetivo: string | null;
  fecha_inicio: string | null;
  fecha_final: string | null;
  id_proyecto: number;
  id_estatus: number;
  project_nombre: string;
}

export interface CalendarProjectRecord {
  id: number;
  nombre: string;
}

export interface CalendarData {
  sprints: CalendarSprintRecord[];
  projects: CalendarProjectRecord[];
}
