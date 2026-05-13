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
