export interface Project {
  id: number;
  nombre: string;
  descripcion: string;
  stack_tecnologico: string[] | null;
  cliente: string;
  fecha_inicial: string;         // ISO: "2026-01-15"
  fecha_final: string;           // ISO: "2026-06-15"
  fecha_creacion: string;        // ISO: "2025-12-01"
  dependencia_externa: boolean;
  hitos_estimados: number;
  fte: number;
  presupuesto: number;
  costo_mensual: number;
  tolerancia_desviacion: number;
  peso_presupuesto: number;
  peso_retraso: number;
  id_divisa_presupuesto: number;
  id_divisa_costo: number;
  id_modelo_facturacion: number;
  id_complejidad: number;
  id_tipo: number;
  id_estatus: number;
  id_metodologia: number;
  id_creador: number;
  total_backlog_items:     number;
  completed_backlog_items: number;
  completion_percentage:   number;
}

// Interfaz para contexto de Projctos.
export type ProjectContextData = Pick<Project,
  | 'id'
  | 'nombre'
  | 'cliente'
  | 'id_metodologia'
  | 'id_estatus'
>;