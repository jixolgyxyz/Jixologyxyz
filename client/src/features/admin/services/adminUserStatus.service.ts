import { supabase } from '@/core/supabase/supabase.client';

export async function setAdminUserActiveService(
  userId: number,
  activo: boolean
): Promise<{ message: string }> {
  const { data, error } = await supabase
    .from('usuario')
    .update({ activo })
    .eq('id', userId)
    .select('id')
    .single();

  if (error) {
    throw new Error(
      error.message ||
        (activo
          ? 'No se pudo reactivar el usuario.'
          : 'No se pudo desactivar el usuario.')
    );
  }

  if (!data) {
    throw new Error('No se encontró el usuario.');
  }

  return {
    message: activo
      ? 'Usuario reactivado correctamente.'
      : 'Usuario desactivado correctamente.',
  };
}