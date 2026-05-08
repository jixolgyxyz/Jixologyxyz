import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { supabase } from '@/core/supabase/supabase.client';

export interface AdminEditableUser {
  id: number;
  auth_id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
  id_rol_global: number | null;
}

export interface UpdateAdminUserPayload {
  id: number;
  auth_id: string;
  email: string;
  original_email: string;
  password?: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number | null;
  id_rol_global: number | null;
}

export async function getAdminUserById(userId: number): Promise<AdminEditableUser> {
  const { data, error } = await supabase
    .from('usuario')
    .select(
      'id, auth_id, email, nombre, apellido, telefono, fecha_nacimiento, sobre_mi, jornada, id_zona_horaria, id_rol_global'
    )
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo cargar el usuario.');
  }

  return data as AdminEditableUser;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function updateAdminUserService(
  payload: UpdateAdminUserPayload
): Promise<{ message: string }> {
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedOriginalEmail = normalizeEmail(payload.original_email);
  const hasPasswordChange = !!payload.password?.trim();
  const hasEmailChange = normalizedEmail !== normalizedOriginalEmail;

  const needsEdgeFunction = hasPasswordChange || hasEmailChange;

  if (!needsEdgeFunction) {
    const { data, error } = await supabase
      .from('usuario')
      .update({
        email: normalizedEmail,
        nombre: payload.nombre,
        apellido: payload.apellido,
        telefono: payload.telefono,
        fecha_nacimiento: payload.fecha_nacimiento,
        sobre_mi: payload.sobre_mi,
        jornada: payload.jornada,
        id_zona_horaria: payload.id_zona_horaria,
        id_rol_global: payload.id_rol_global,
      })
      .eq('id', payload.id)
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar el usuario.');
    }

    if (!data) {
      throw new Error('No se encontró el usuario para actualizar.');
    }

    return { message: 'Usuario actualizado correctamente.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const options: {
    body: UpdateAdminUserPayload;
    headers?: Record<string, string>;
  } = {
    body: {
      ...payload,
      email: normalizedEmail,
      password: payload.password?.trim() || undefined,
    },
  };

  if (session?.access_token) {
    options.headers = {
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  const { data, error } = await supabase.functions.invoke('update_admin_user', options);

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let errorBody: { error?: string; message?: string } | null = null;

      try {
        errorBody = await error.context.json();
      } catch {
        throw new Error('La Edge Function devolvió un error HTTP sin cuerpo JSON.');
      }

      throw new Error(
        errorBody?.error ||
          errorBody?.message ||
          'La Edge Function devolvió un error.'
      );
    }

    if (error instanceof FunctionsRelayError) {
      throw new Error(`Relay error: ${error.message}`);
    }

    if (error instanceof FunctionsFetchError) {
      throw new Error(`Fetch error: ${error.message}`);
    }

    throw new Error(error.message || 'No se pudo actualizar el usuario.');
  }

  if (!data) {
    throw new Error('La Edge Function no devolvió datos.');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as { message: string };
}