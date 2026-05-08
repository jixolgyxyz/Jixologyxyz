import { supabase } from '@/core/supabase/supabase.client';
import type { InvitacionPendienteRecord } from '../types/invitacion.types';

type RpcRow = {
  id: number;
  descripcion: string | null;
  fecha_envio: string;
  id_proyecto: number;
  nombre_proyecto: string;
  id_usuario_creador: number;
};

export async function getPendingInvitations(): Promise<InvitacionPendienteRecord[]> {
  const { data, error } = await supabase.rpc('get_pending_invitations');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: RpcRow) => ({
    id: row.id,
    descripcion: row.descripcion,
    fecha_envio: row.fecha_envio,
    id_proyecto: row.id_proyecto,
    nombre_proyecto: row.nombre_proyecto,
    id_usuario_creador: row.id_usuario_creador,
  }));
}

export async function acceptInvitation(invitacionId: number): Promise<void> {
  const { error } = await supabase.rpc('accept_project_invitation', {
    p_invitacion_id: invitacionId,
  });
  if (error) throw new Error(error.message);
}

export async function denyInvitation(invitacionId: number): Promise<void> {
  const { error } = await supabase.rpc('deny_project_invitation', {
    p_invitacion_id: invitacionId,
  });
  if (error) throw new Error(error.message);
}
