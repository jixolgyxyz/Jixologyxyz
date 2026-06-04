export interface BitacoraSprintRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  reporte_ia: string | null;
  fecha_creacion: string;
  id_sprint: number;
  id_usuario_creador: number;
}

export interface BitacoraSprintSummary {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string;
}

export interface ImpedimentoSimpleRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  resuelto: boolean;
  costo: number | null;
}

export interface ProyectoPresupuestoInfo {
  presupuesto: number | null;
  costo_mensual: number | null;
  tolerancia_desviacion: number | null;
  abreviatura: string | null;
}

export interface ImpedimentoRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  resuelto: boolean;
  costo: number | null;
  id_backlog_item: number;
  id_usuario_creador: number;
  backlog_item: {
    id: number;
    nombre: string;
    id_sprint: number | null;
  } | null;
}
