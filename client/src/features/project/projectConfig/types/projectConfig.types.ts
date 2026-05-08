export interface ProjectMemberRecord {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
}

export interface EtiquetaPersonalizadaRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  color_bloque: string;
  color_letra: string;
  id_proyecto: number;
  id_creador: number;
}

export interface EtiquetaPredeterminadaRecord {
  id: number;
  nombre: string;
  descripcion: string | null;
  color_bloque: string;
  color_letra: string;
}

export interface MemberEtiquetaRecord {
  id_usuario: number;
  id_etiqueta_proyecto_personalizada: number;
}

export interface MemberEtiquetaPredeterminadaRecord {
  id_usuario: number;
  id_etiqueta_proyecto_predeterminada: number;
  id_proyecto: number;
}

export interface CreateEtiquetaPayload {
  nombre: string;
  descripcion?: string | null;
  color_bloque: string;
  color_letra: string;
  id_proyecto: number;
  id_creador: number;
}

export interface UpdateEtiquetaPayload {
  nombre: string;
  descripcion?: string | null;
  color_bloque: string;
  color_letra: string;
}

export interface FteMemberRecord {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  jornada: number | null;
  cantidad_horas: number | null;
  fte: number | null;
  /** Hours already committed to OTHER projects */
  horas_otros: number;
  /** Max hours available for this project = jornada − horas_otros (null if no jornada set) */
  max_horas: number | null;
}

export interface ProyectoFteRecord {
  id_usuario: number;
  id_proyecto: number;
  cantidad_horas: number | null;
  fte: number | null;
}
