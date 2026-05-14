export interface BacklogItemRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  es_terminal: boolean;
  id_usuario_creador: number;
  id_backlog_item_padre: number | null;
  id_usuario_responsable: number | null;
  id_prioridad: number | null;
  id_tipo: number | null;
  id_estatus: number;
  id_proyecto: number;
  id_sprint: number | null;
  complejidad:      number | null;
  tiempo:           number | null;
  tiempo_estimado:  number | null;
  fecha_completado: string | null;
}

export interface BacklogStatusRecord {
  id: number;
  nombre: string;
  orden: number;
  es_terminal: boolean;
}

export interface BacklogPriorityRecord {
  id: number;
  nombre: string;
}

export interface BacklogTypeRecord {
  id: number;
  nombre: string;
}

export interface SprintRecord {
  id: number;
  nombre: string;
  objetivo: string | null;
  fecha_inicio: string | null;
  fecha_final: string | null;
  id_proyecto: number;
  id_usuario_creador: number;
  id_estatus: number;
}

export interface UpdateBacklogItemPayload {
  nombre: string;
  descripcion?: string | null;
  id_tipo?: number | null;
  id_estatus: number;
  id_prioridad?: number | null;
  id_sprint?: number | null;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  id_backlog_item_padre?: number | null;
  id_usuario_responsable?: number | null;
  complejidad?: number | null;
  tiempo?: number | null;
  tiempo_estimado?: number | null;
}

export interface CreateBacklogItemPayload {
  nombre: string;
  descripcion?: string | null;
  id_tipo?: number | null;
  id_estatus: number;
  id_prioridad?: number | null;
  id_sprint?: number | null;
  id_usuario_responsable?: number | null;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  id_backlog_item_padre?: number | null;
  id_proyecto: number;
  id_usuario_creador: number;
  complejidad?: number | null;
}

export interface UserRecord {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
}

export interface SugerenciaRecord {
  id: number;
  aceptada: boolean;
  id_usuario_acepto: number | null;
}

export interface ProjectEtiquetaRecord {
  id_usuario: number;
  id_etiqueta_proyecto_predeterminada: number;
  id_proyecto: number;
}

export interface BacklogMeta {
  statuses:    BacklogStatusRecord[];
  priorities:  BacklogPriorityRecord[];
  types:       BacklogTypeRecord[];
  sprints:     SprintRecord[];
  items:       BacklogItemRecord[];
  users:       UserRecord[];
  sugerencias: SugerenciaRecord[];
  etiquetas:   ProjectEtiquetaRecord[];
}
