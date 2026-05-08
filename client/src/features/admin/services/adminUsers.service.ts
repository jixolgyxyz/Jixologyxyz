import { supabase } from '@/core/supabase/supabase.client';
import type { AdminUserListItem } from '../types/admin.types';

export async function getAdminUsers(
  search: string,
  statusFilter: 'active' | 'inactive' | 'all' = 'active'
): Promise<AdminUserListItem[]> {
  let query = supabase
    .from('usuario')
    .select('id, nombre, apellido, email, id_rol_global, activo')
    .order('id', { ascending: false })
    .limit(10);

  if (search.trim()) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (statusFilter === 'active') {
    query = query.eq('activo', true);
  } else if (statusFilter === 'inactive') {
    query = query.eq('activo', false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'No se pudieron cargar los usuarios.');
  }

  return data ?? [];
}