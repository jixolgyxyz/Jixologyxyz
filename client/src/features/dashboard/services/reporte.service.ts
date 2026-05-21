import { supabase } from '@/core/supabase/supabase.client';
import { buildPdf } from './weeklyReport.service';
import { localDateString } from '../utils/dates';

export interface ReporteRow {
  id:                  number;
  nombre:              string | null;
  contenido:           string;
  fecha_creacion:      string;
  semana_inicio:       string;
  id_usuario_creador:  number | null;
  visibilidad:         'publico' | 'privado';
  creador:             string | null; // "Nombre Apellido" of the creator
}

export async function saveReport(
  contenido: string,
  semanaInicio: Date,
  userId: number,
  nombre?: string,
  visibilidad: 'publico' | 'privado' = 'publico',
): Promise<number> {
  const { data, error } = await supabase
    .from('reporte')
    .insert({
      contenido,
      semana_inicio:      localDateString(semanaInicio),
      id_usuario_creador: userId,
      nombre:             nombre ?? null,
      visibilidad,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error al guardar reporte: ${error.message}`);
  return data.id;
}

export async function linkCheckIns(
  reportId: number,
  semanaInicio: Date,
): Promise<void> {
  const monday = new Date(semanaInicio);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data: checkIns, error: fetchError } = await supabase
    .from('check_in')
    .select('id')
    .gte('fecha_creacion', monday.toISOString())
    .lte('fecha_creacion', sunday.toISOString());

  if (fetchError) throw new Error(`Error al buscar check-ins: ${fetchError.message}`);
  if (!checkIns || checkIns.length === 0) return;

  const rows = checkIns.map(c => ({ id_reporte: reportId, id_check_in: c.id }));
  const { error: insertError } = await supabase.from('check_ins_incluidos').insert(rows);
  if (insertError) throw new Error(`Error al vincular check-ins: ${insertError.message}`);
}

export function downloadReport(r: ReporteRow): void {
  const label = new Date(r.semana_inicio + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const pdf      = buildPdf(r.contenido, label);
  const filename = r.nombre ? `${r.nombre}.pdf` : `reporte-${r.semana_inicio}.pdf`;
  pdf.save(filename);
}

export async function fetchReports(userId: number): Promise<ReporteRow[]> {
  // Visibility is filtered in the query (public reports + the user's own),
  // so private reports of other users are never transferred to the client.
  const { data, error } = await supabase
    .from('reporte')
    .select('id, nombre, contenido, fecha_creacion, semana_inicio, id_usuario_creador, visibilidad, usuario:id_usuario_creador(nombre, apellido)')
    .or(`visibilidad.eq.publico,id_usuario_creador.eq.${userId}`)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(`Error al obtener reportes: ${error.message}`);

  return (data ?? []).map((r: Record<string, unknown>) => {
    const u = r.usuario as { nombre: string | null; apellido: string | null } | null;
    const creador = u ? [u.nombre, u.apellido].filter(Boolean).join(' ') || null : null;
    return { ...r, creador } as ReporteRow;
  });
}
