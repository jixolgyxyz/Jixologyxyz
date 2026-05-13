import { supabase } from '@/core/supabase/supabase.client';
import { env } from '@/core/config/env';
import type { BitacoraSprintRecord, BitacoraSprintSummary } from '../types/bitacora.types';

// Set VITE_BUSINESS_API_URL in your .env to point to the Express server
const SERVER_URL = env.businessApiUrl ?? 'http://localhost:3000';

async function getAuthHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No autenticado');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Calls the Express server to generate an AI sprint report and save it.
 * The server fetches sprint data, calls Gemini, and writes to bitacora_sprint.
 */
export async function generateSprintReport(sprintId: number): Promise<BitacoraSprintRecord> {
  const headers = await getAuthHeader();
  const res = await fetch(`${SERVER_URL}/api/bitacora/sprint/${sprintId}/generate`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Error ${res.status}`);
  }

  return res.json() as Promise<BitacoraSprintRecord>;
}

/**
 * Fetches all bitacora entries for a sprint directly from Supabase (RLS enforced).
 */
export async function fetchSprintBitacoras(sprintId: number): Promise<BitacoraSprintSummary[]> {
  const { data, error } = await supabase
    .from('bitacora_sprint')
    .select('id, nombre, descripcion, fecha_creacion')
    .eq('id_sprint', sprintId)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BitacoraSprintSummary[];
}

/**
 * Fetches a single bitacora entry including the full AI report (Markdown).
 */
export async function fetchBitacoraById(id: number): Promise<BitacoraSprintRecord> {
  const { data, error } = await supabase
    .from('bitacora_sprint')
    .select('id, nombre, descripcion, reporte_ia, fecha_creacion, id_sprint, id_usuario_creador')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as BitacoraSprintRecord;
}
