export interface InvitacionPendienteRecord {
  id: number;
  descripcion: string | null;
  fecha_envio: string;
  id_proyecto: number;
  nombre_proyecto: string;
  id_usuario_creador: number;
}
