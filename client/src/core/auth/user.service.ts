import { supabase } from "../supabase/supabase.client";

export interface UserProfile {
  id: number;
  authId: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  idZonaHoraria: number | null;
  zonaHoraria: string | null;
  idRolGlobal: number | null;
  rol: string | null;
  activo: boolean;
} 

async function fetchUserRow(authId: string) {
  return supabase
    .from("usuario")
    .select("id, auth_id, nombre, apellido, email, id_zona_horaria, id_rol_global, activo, rol_global(nombre), zona_horaria(nombre)")
    .eq("auth_id", authId)
    .maybeSingle();
}

export async function fetchCurrentUser(authId: string): Promise<UserProfile | null> {
  // Retry transient network failures (e.g. Windows ERR_NO_BUFFER_SPACE under
  // heavy parallel test load, brief Wi-Fi drops, dev-server restarts).
  let res = await fetchUserRow(authId).catch(err => ({ data: null, error: err }));
  for (let attempt = 1; attempt < 3 && res.error; attempt++) {
    await new Promise(r => setTimeout(r, 150 * attempt));
    res = await fetchUserRow(authId).catch(err => ({ data: null, error: err }));
  }

  const { data, error } = res;
  if (error) throw new Error(`${error.message ?? error}, ${error.code ?? 'unknown'}`);
  if (!data) return null;

  const rolGlobal   = data.rol_global   as unknown as { nombre: string } | null;
  const zonaHoraria = data.zona_horaria as unknown as { nombre: string } | null;

  return {
    id: data.id,
    authId: data.auth_id,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    idZonaHoraria: data.id_zona_horaria,
    zonaHoraria: zonaHoraria?.nombre ?? null,
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