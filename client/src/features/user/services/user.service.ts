import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../core/supabase/supabase.client';

export interface UserProfileDetail {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  sobreMi: string | null;
}

export async function fetchUserProfile(userId: number): Promise<UserProfileDetail> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, email, telefono, fecha_nacimiento, sobre_mi')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    telefono: data.telefono,
    fechaNacimiento: data.fecha_nacimiento,
    sobreMi: data.sobre_mi,
  };
}

export async function updateSobreMi(userId: number, sobreMi: string): Promise<void> {
  const { error } = await supabase
    .from('usuario')
    .update({ sobre_mi: sobreMi })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export function useUserProfile(userId: number | null | undefined) {
  const [userProfile, setUserProfile] = useState<UserProfileDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (userId == null) return;

    fetchUserProfile(userId)
      .then(setUserProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [userId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  return { userProfile, loading, error, refresh };
}
