import { supabase } from "../supabase/supabase.client";

export interface UserProfile {
  id: number;
  authId: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  idZonaHoraria: number | null;
  idRolGlobal: number | null;
  rol: string | null;
  activo: boolean;
}

export async function fetchCurrentUser(authId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("usuario")
    .select("id, auth_id, nombre, apellido, email, id_zona_horaria, id_rol_global, activo, rol_global(nombre)")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error) throw new Error(`${error.message}, ${error.code}`);
  if (!data) return null;

  const rolGlobal = data.rol_global as unknown as { nombre: string } | null;

  return {
    id: data.id,
    authId: data.auth_id,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    idZonaHoraria: data.id_zona_horaria,
    idRolGlobal: data.id_rol_global,
    rol: rolGlobal?.nombre ?? null,
    activo: data.activo,
  };
}

export async function hasAdminRole(userId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("usuario")
    .select("id")
    .eq("id", userId)
    .in("id_rol_global", [1, 2])
    .single();

  if (error) return false;
  return !!data;
}