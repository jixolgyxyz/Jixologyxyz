import { supabase } from '@/core/supabase/supabase.client';
import { callGemini } from '@/shared/services/gemini.service';
import type { BitacoraSprintRecord, BitacoraSprintSummary, ImpedimentoRecord, ImpedimentoSimpleRecord, ProyectoPresupuestoInfo } from '../types/bitacora.types';

const PROMPT = `Eres un Scrum Master experimentado y analista de proyectos ágiles. Tu tarea es generar un reporte retrospectivo estructurado y profesional en español a partir de datos de un sprint.

Reglas:
- Sé específico: usa los números exactos y porcentajes del JSON provisto.
- Sé constructivo: identifica problemas pero propón soluciones concretas.
- Si un campo es null o ausente, indícalo brevemente y trabaja con los datos disponibles.
- No inventes datos que no estén en el JSON.
- Escribe en tercera persona para el análisis de colaboradores.
- Devuelve únicamente el reporte en Markdown, sin texto introductorio ni explicaciones adicionales.

Estructura del reporte:

## Resumen Ejecutivo
- Nombre del sprint, proyecto, metodología y objetivo declarado
- Período de fechas
- Tasa global de completitud con cifra absoluta (X de Y items = Z%)
- Veredicto: Exitoso / Con dificultades / Crítico, con justificación en 1-2 frases

## Desempeño por Colaborador
Para cada colaborador, ordenados de mayor a menor tasa de completitud:
### [Nombre]
- Items: [completados]/[asignados] ([tasa]%)
- Complejidad promedio asignada: [valor] | completada: [valor]
- Tiempo estimado: [horas]h
- Tipos: [lista de tipos]
- Evaluación: 2-3 frases sobre su contribución considerando complejidad y volumen

## Balance de Carga
- ¿La distribución fue equitativa? Compara volumen y complejidad entre colaboradores
- Identifica si alguien cargó desproporcionadamente más trabajo
- Menciona items sin asignar si los hay

## Métricas del Sprint
- Velocidad: N items completados
- Por tipo: total vs completados para cada tipo
- Por prioridad: total vs completados para cada nivel
- Items de prioridad Crítica o Alta no completados (si aplica)

## Hallazgos Clave

**Lo que funcionó bien:**
- Máximo 3 puntos con evidencia numérica de los datos

**Áreas de atención:**
- Máximo 3 puntos con evidencia numérica de los datos

## Recomendaciones para el Próximo Sprint
1. Recomendación sobre distribución de trabajo
2. Recomendación sobre proceso o calidad
3. Recomendación basada en el patrón de items incompletos
4. Recomendación adicional si los datos lo justifican`;

export async function generateSprintReport(
  sprintId: number,
  usuarioId: number,
): Promise<BitacoraSprintRecord> {
  // 1. Fetch structured sprint data via the RPC (enforces project membership)
  const { data: sprintData, error: rpcError } = await supabase
    .rpc('get_sprint_report_data', {
      p_sprint_id: sprintId,
      p_usuario_id: usuarioId,
    });

  if (rpcError) throw new Error(`Error al obtener datos del sprint: ${rpcError.message}`);
  if (!sprintData?.sprint) throw new Error('Sprint no encontrado o sin acceso');
  if ((sprintData.resumen?.total_items ?? 0) === 0) {
    throw new Error('Este sprint no tiene backlog items para analizar');
  }

  // 2. Call Gemini with the prompt + sprint data
  const fullPrompt = `${PROMPT}\n\nDatos del sprint:\n\`\`\`json\n${JSON.stringify(sprintData, null, 2)}\n\`\`\``;
  const reportContent = await callGemini(fullPrompt);

  // 3. Save to bitacora_sprint
  const { data: bitacora, error: insertError } = await supabase
    .from('bitacora_sprint')
    .insert({
      nombre: `Reporte IA – ${sprintData.sprint.nombre}`,
      descripcion: `Análisis automatizado del sprint "${sprintData.sprint.nombre}" generado por IA`,
      reporte_ia: reportContent,
      fecha_creacion: new Date().toISOString(),
      id_usuario_creador: usuarioId,
      id_sprint: sprintId,
    })
    .select('id, nombre, descripcion, reporte_ia, fecha_creacion, id_sprint, id_usuario_creador')
    .single();

  if (insertError) throw new Error(`Error al guardar la bitácora: ${insertError.message}`);
  return bitacora as BitacoraSprintRecord;
}

export async function fetchSprintBitacoras(sprintId: number): Promise<BitacoraSprintSummary[]> {
  const { data, error } = await supabase
    .from('bitacora_sprint')
    .select('id, nombre, descripcion, fecha_creacion')
    .eq('id_sprint', sprintId)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BitacoraSprintSummary[];
}

export async function fetchBitacoraById(id: number): Promise<BitacoraSprintRecord> {
  const { data, error } = await supabase
    .from('bitacora_sprint')
    .select('id, nombre, descripcion, reporte_ia, fecha_creacion, id_sprint, id_usuario_creador')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as BitacoraSprintRecord;
}

export async function fetchImpedimentosBySprint(sprintId: number): Promise<ImpedimentoRecord[]> {
  const { data, error } = await supabase
    .from('impedimento_backlog_item')
    .select('id, nombre, descripcion, resuelto, costo, id_backlog_item, id_usuario_creador, backlog_item:id_backlog_item!inner(id, nombre, id_sprint)')
    .eq('backlog_item.id_sprint', sprintId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ImpedimentoRecord[];
}

export async function createImpedimento(
  nombre: string,
  descripcion: string | null,
  idBacklogItem: number,
  idUsuarioCreador: number,
  costo: number | null = null,
): Promise<void> {
  const { error } = await supabase
    .from('impedimento_backlog_item')
    .insert({ nombre, descripcion, id_backlog_item: idBacklogItem, id_usuario_creador: idUsuarioCreador, costo });
  if (error) throw new Error(error.message);
}

export async function fetchImpedimentosByItem(itemId: number): Promise<ImpedimentoSimpleRecord[]> {
  const { data, error } = await supabase
    .from('impedimento_backlog_item')
    .select('id, nombre, descripcion, resuelto, costo')
    .eq('id_backlog_item', itemId)
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImpedimentoSimpleRecord[];
}

export async function updateImpedimentoResuelto(id: number, resuelto: boolean): Promise<void> {
  const { error } = await supabase
    .from('impedimento_backlog_item')
    .update({ resuelto })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchProyectoPresupuesto(projectId: number): Promise<ProyectoPresupuestoInfo> {
  const { data, error } = await supabase
    .from('proyecto')
    .select('presupuesto, costo_mensual, tolerancia_desviacion, divisa:id_divisa_presupuesto(abreviatura)')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  const raw = data as unknown as {
    presupuesto: number | null;
    costo_mensual: number | null;
    tolerancia_desviacion: number | null;
    divisa: { abreviatura: string }[] | { abreviatura: string } | null;
  };
  const div = raw.divisa;
  const abreviatura = Array.isArray(div) ? (div[0]?.abreviatura ?? null) : (div?.abreviatura ?? null);
  return {
    presupuesto: raw.presupuesto,
    costo_mensual: raw.costo_mensual,
    tolerancia_desviacion: raw.tolerancia_desviacion,
    abreviatura,
  };
}
