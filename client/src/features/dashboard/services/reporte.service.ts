import { supabase } from '@/core/supabase/supabase.client';

export interface ReporteRow {
  id:                  number;
  contenido:           string;
  fecha_creacion:      string;
  semana_inicio:       string;
  id_usuario_creador:  number | null;
}

export async function saveReport(
  contenido: string,
  semanaInicio: Date,
  userId: number,
): Promise<number> {
  const { data, error } = await supabase
    .from('reporte')
    .insert({
      contenido,
      semana_inicio: semanaInicio.toISOString().slice(0, 10),
      id_usuario_creador: userId,
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

  const { error: insertError } = await supabase
    .from('check_ins_incluidos')
    .insert(rows);

  if (insertError) throw new Error(`Error al vincular check-ins: ${insertError.message}`);
}

export async function fetchReports(): Promise<ReporteRow[]> {
  const { data, error } = await supabase
    .from('reporte')
    .select('id, contenido, fecha_creacion, semana_inicio, id_usuario_creador')
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(`Error al obtener reportes: ${error.message}`);
  return data ?? [];
}
