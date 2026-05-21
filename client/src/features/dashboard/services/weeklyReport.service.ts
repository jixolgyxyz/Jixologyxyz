import { jsPDF } from 'jspdf';
import { callGemini } from '@/shared/services/gemini.service';
import { saveReport, linkCheckIns } from './reporte.service';
import { currentWorkWeek, localDateString } from '../utils/dates';
import type { AdminDashboardData } from '../hooks/useAdminDashboardData';
import type { ReportConfig } from '../hooks/useWeeklyReport';

// ── Filter data by project names (for custom reports) ─────────────────────

function filterData(data: AdminDashboardData, names: string[]): AdminDashboardData {
  const set = new Set(names);
  const keep = <T extends { name: string }>(arr: T[]) => arr.filter(r => set.has(r.name));
  const completionByProject = keep(data.completionByProject);
  return {
    ...data,
    // `projectStatus` holds status names, not project names — it can't be
    // filtered by `set`. Count the selected projects from the kept rows.
    activeProjects:          completionByProject.length,
    completionByProject,
    volumeByProject:         keep(data.volumeByProject),
    sprintHealth:            keep(data.sprintHealth),
    fteByProject:            keep(data.fteByProject),
    overdueByProject:        keep(data.overdueByProject),
    backlogPressure:         keep(data.backlogPressure),
    hoursDonePending:        keep(data.hoursDonePending),
    overdueHoursByProject:   keep(data.overdueHoursByProject),
    estimatedHoursByProject: keep(data.estimatedHoursByProject),
    weeklyProgress: {
      ...data.weeklyProgress,
      byProject: keep(data.weeklyProgress.byProject),
    },
  };
}

// ── Build the prompt ───────────────────────────────────────────────────────

function buildPrompt(data: AdminDashboardData, dateLabel: string, metrics?: string[]): string {
  const has = (key: string) => !metrics || metrics.includes(key);

  const totalOverdue      = data.overdueByProject.reduce((s, r) => s + r.overdue, 0);
  const activeSprintCount = data.sprintHealth.reduce((s, r) => s + r.active, 0);
  const totalHoursDone    = data.hoursDonePending.reduce((s, r) => s + r.done, 0);
  const totalHoursPending = data.hoursDonePending.reduce((s, r) => s + r.pending, 0);
  const totalOverdueHours = data.overdueHoursByProject.reduce((s, r) => s + r.hours, 0);
  const top = <T,>(arr: T[], n = 10) => arr.slice(0, n);

  const volumeMap      = new Map(data.volumeByProject.map(r => [r.name, r.count]));
  const pendingHoursMap = new Map(data.hoursDonePending.map(r => [r.name, r.pending]));

  const totalTypedHours = data.hoursByType.reduce((s, r) => s + r.hours, 0);
  const bugHours        = data.hoursByType.find(r => r.tipo.toLowerCase().includes('bug'))?.hours ?? 0;
  const bugRatioPct     = totalTypedHours > 0 ? Math.round((bugHours / totalTypedHours) * 100) : 0;

  const dataLines: string[] = [
    `- Proyectos activos: ${data.activeProjects}, Ítems totales: ${data.totalItems}, Sprints activos: ${activeSprintCount}, Ítems vencidos: ${totalOverdue}`,
  ];

  if (has('global_status')) {
    const lines = data.globalItemStatus.map(r => `${r.name}: ${r.value}`).join(', ');
    dataLines.push(`- Estado global de ítems: ${lines}`);
  }
  if (has('completion')) {
    const lines = top(data.completionByProject).map(r => `${r.name}: ${r.rate}% (${r.done}/${r.total})`).join(', ');
    dataLines.push(`- Tasas de completación: ${lines}`);
  }
  if (has('volume')) {
    const lines = top(data.volumeByProject).map(r => `${r.name}: ${r.count} ítems`).join(', ');
    dataLines.push(`- Volumen de backlog por proyecto: ${lines}`);
  }
  if (has('sprint_health')) {
    const lines = top(data.sprintHealth).map(r => `${r.name}: ${r.active} activos/${r.terminal} cerrados`).join(', ');
    dataLines.push(`- Salud de sprints: ${lines}`);
  }
  if (has('sprint_completion')) {
    const lines = top(data.sprintHealth).map(r => {
      const total = r.active + r.terminal;
      const ratio = total > 0 ? Math.round((r.terminal / total) * 100) : 0;
      return `${r.name}: ${ratio}% (${r.terminal}/${total} sprints cerrados)`;
    }).join(', ');
    dataLines.push(`- Ratio de cierre de sprints: ${lines}`);
  }
  if (has('weekly_progress')) {
    const lines = data.weeklyProgress.byProject.length === 0
      ? 'sin ítems con vencimiento esta semana'
      : top(data.weeklyProgress.byProject).map(r => `${r.name}: ${r.rate}%`).join(', ');
    dataLines.push(`- Progreso semanal por proyecto: ${lines}`);
  }
  if (has('overdue_items')) {
    const lines = data.overdueByProject.length === 0
      ? 'ninguno'
      : top(data.overdueByProject).map(r => `${r.name}: ${r.overdue}`).join(', ');
    dataLines.push(`- Ítems vencidos por proyecto: ${lines}`);
  }
  if (has('overdue_rate')) {
    const lines = data.overdueByProject.length === 0
      ? 'ninguno'
      : top(data.overdueByProject).map(r => {
          const total = volumeMap.get(r.name) ?? 0;
          const rate  = total > 0 ? Math.round((r.overdue / total) * 100) : 0;
          return `${r.name}: ${rate}% (${r.overdue}/${total})`;
        }).join(', ');
    dataLines.push(`- Tasa de vencimiento por proyecto (% del backlog vencido): ${lines}`);
  }
  if (has('backlog_pressure')) {
    const lines = data.backlogPressure.length === 0
      ? 'ninguno'
      : top(data.backlogPressure).map(r => `${r.name}: score ${r.weightedScore} (promedio ${r.avgDays}d vencido, complejidad ${r.avgComplexity})`).join(', ');
    dataLines.push(`- Presión de backlog (score ponderado = días × complejidad): ${lines}`);
  }
  if (has('overdue_hours')) {
    const lines = data.overdueHoursByProject.length === 0
      ? 'ninguno'
      : top(data.overdueHoursByProject).map(r => `${r.name}: ${r.hours}h`).join(', ');
    dataLines.push(`- Horas en deuda (total ${totalOverdueHours}h): ${lines}`);
  }
  if (has('delivery_risk')) {
    const lines = data.overdueHoursByProject.length === 0
      ? 'ninguno'
      : top(data.overdueHoursByProject).map(r => {
          const pending = pendingHoursMap.get(r.name) ?? 0;
          const risk    = pending > 0 ? Math.round((r.hours / pending) * 100) : 100;
          return `${r.name}: ${risk}% de horas pendientes en riesgo`;
        }).join(', ');
    dataLines.push(`- Índice de riesgo de entrega (horas vencidas / horas pendientes): ${lines}`);
  }
  if (has('hours_done_pending')) {
    const lines = top(data.hoursDonePending).map(r => `${r.name}: ${r.done}h completadas / ${r.pending}h pendientes`).join(', ');
    dataLines.push(`- Horas completadas vs. pendientes (total ${totalHoursDone}h / ${totalHoursPending}h): ${lines}`);
  }
  if (has('fte')) {
    const lines = top(data.fteByProject).map(r => `${r.name}: ${r.fte} FTE`).join(', ');
    dataLines.push(`- FTE por proyecto: ${lines}`);
  }
  if (has('priority_hours')) {
    const lines = data.hoursByPriority.map(r => `${r.prioridad}: ${r.hours}h`).join(', ');
    dataLines.push(`- Horas por prioridad: ${lines}`);
  }
  if (has('bug_ratio')) {
    const lines = data.hoursByType.map(r => `${r.tipo}: ${r.hours}h`).join(', ');
    dataLines.push(`- Horas por tipo de ítem (ratio de bugs: ${bugRatioPct}%): ${lines}`);
  }

  return `Reporte de salud de proyectos para ${dateLabel}. Escribe en español como un reporte profesional para liderazgo. IMPORTANTE: usa SOLO texto plano — sin asteriscos, sin negritas, sin cursivas, sin markdown de ningún tipo. Los títulos de sección deben escribirse exactamente así, sin ningún símbolo adicional:
1. Resumen Ejecutivo
2. KPIs Clave
3. Salud por Proyecto (una línea por proyecto)
4. Riesgos y Bloqueos
5. Capacidad y Esfuerzo
6. Recomendaciones

DATOS:
${dataLines.join('\n')}

Sé conciso. Cada sección máximo 4 oraciones o puntos.`;
}

// ── Build PDF ──────────────────────────────────────────────────────────────

export function buildPdf(reportText: string, weekLabel: string, data?: AdminDashboardData, metrics?: string[]): jsPDF {
  const has = (key: string) => !metrics || metrics.includes(key);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkY = (needed: number) => {
    if (y + needed > pageH - margin) addPage();
  };

  // ── Header bar ──────────────────────────────────────────────────────────
  doc.setFillColor(10, 8, 56);
  doc.rect(0, 0, pageW, 64, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('JIXOLOGY', margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 190, 220);
  doc.text('Reporte Semanal de Salud de Proyectos', margin, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(weekLabel, pageW - margin, 50, { align: 'right' });

  y = 64 + 28;

  // ── Metrics Snapshot ─────────────────────────────────────────────────────
  if (data) {
  // Pre-compute derived values
  const totalOverdue      = data.overdueByProject.reduce((s, r) => s + r.overdue, 0);
  const activeSprintCount = data.sprintHealth.reduce((s, r) => s + r.active, 0);
  const totalHoursDone    = data.hoursDonePending.reduce((s, r) => s + r.done, 0);
  const totalHoursPending = data.hoursDonePending.reduce((s, r) => s + r.pending, 0);
  const totalOverdueHours = data.overdueHoursByProject.reduce((s, r) => s + r.hours, 0);
  const totalTypedHours   = data.hoursByType.reduce((s, r) => s + r.hours, 0);
  const bugHours          = data.hoursByType.find(r => r.tipo.toLowerCase().includes('bug'))?.hours ?? 0;
  const bugRatioPct       = totalTypedHours > 0 ? Math.round((bugHours / totalTypedHours) * 100) : 0;

  const volumeMap      = new Map(data.volumeByProject.map(r => [r.name, r.count]));
  const pendingHoursMap = new Map(data.hoursDonePending.map(r => [r.name, r.pending]));
  const overdueHoursMap = new Map(data.overdueHoursByProject.map(r => [r.name, r.hours]));
  const fteMap         = new Map(data.fteByProject.map(r => [r.name, r.fte]));
  const sprintMap      = new Map(data.sprintHealth.map(r => [r.name, r]));
  const pressureMap    = new Map(data.backlogPressure.map(r => [r.name, r]));

  // Section label
  checkY(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 8, 56);
  doc.text('Resumen de Métricas', margin, y);
  y += 14;
  doc.setDrawColor(10, 8, 56);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 3, margin + contentW, y - 3);
  y += 10;

  // KPI tiles — 4 per row, conditionally shown
  const kpiTiles = [
    { label: 'Proyectos activos', value: String(data.activeProjects),  always: true },
    { label: 'Ítems totales',     value: String(data.totalItems),      always: true },
    { label: 'Ítems vencidos',    value: String(totalOverdue),         always: false, metric: 'overdue_items' },
    { label: 'Sprints activos',   value: String(activeSprintCount),    always: false, metric: 'sprint_health' },
    { label: 'Horas completadas', value: `${totalHoursDone}h`,         always: false, metric: 'hours_done_pending' },
    { label: 'Horas pendientes',  value: `${totalHoursPending}h`,      always: false, metric: 'hours_done_pending' },
    { label: 'Horas en deuda',    value: `${totalOverdueHours}h`,      always: false, metric: 'overdue_hours' },
    { label: 'Ratio de bugs',     value: `${bugRatioPct}%`,            always: false, metric: 'bug_ratio' },
  ].filter(t => t.always || has(t.metric!));

  const cols      = 4;
  const tileGap   = 8;
  const tileW     = (contentW - tileGap * (cols - 1)) / cols;
  const tileH     = 44;
  const tileRows  = Math.ceil(kpiTiles.length / cols);

  checkY(tileH * tileRows + tileGap * (tileRows - 1) + 4);
  for (let i = 0; i < kpiTiles.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx  = margin + col * (tileW + tileGap);
    const ty  = y + row * (tileH + tileGap);

    doc.setFillColor(240, 241, 248);
    doc.roundedRect(tx, ty, tileW, tileH, 4, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(10, 8, 56);
    doc.text(kpiTiles[i].value, tx + tileW / 2, ty + 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 130);
    doc.text(kpiTiles[i].label, tx + tileW / 2, ty + 34, { align: 'center' });
  }
  y += tileH * tileRows + tileGap * (tileRows - 1) + 16;

  // Per-project table — only render when at least one metric column is visible
  const projects = data.completionByProject.map(r => r.name);
  const tableMetricCols = ['completion','overdue_rate','delivery_risk','sprint_completion','backlog_pressure','fte'];
  const hasTableCols = tableMetricCols.some(k => has(k));

  if (projects.length > 0 && hasTableCols) {
    checkY(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(10, 8, 56);
    doc.text('Métricas por Proyecto', margin, y);
    y += 12;

    // Table header — conditionally include columns based on selected metrics
    type ColDef = { label: string; w: number; metric?: string };
    const allCols: ColDef[] = [
      { label: 'Proyecto',           w: 130 },
      { label: 'Completación',       w: 62,  metric: 'completion' },
      { label: 'Tasa vencimiento',   w: 70,  metric: 'overdue_rate' },
      { label: 'Riesgo entrega',     w: 66,  metric: 'delivery_risk' },
      { label: 'Cierre sprints',     w: 72,  metric: 'sprint_completion' },
      { label: 'Presión backlog',    w: 74,  metric: 'backlog_pressure' },
      { label: 'FTE',                w: 0,   metric: 'fte' },
    ];
    const colDefs = allCols.filter(c => !c.metric || has(c.metric));
    // Give remaining width to last column
    const fixedW = colDefs.slice(0, -1).reduce((s, c) => s + c.w, 0);
    colDefs[colDefs.length - 1].w = contentW - fixedW;
    const rowH = 18;

    checkY(rowH * (projects.length + 1) + 4);

    // Header row
    doc.setFillColor(10, 8, 56);
    doc.rect(margin, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let cx = margin + 5;
    for (const col of colDefs) {
      doc.text(col.label, cx, y + 12);
      cx += col.w;
    }
    y += rowH;

    // Data rows
    for (let i = 0; i < projects.length; i++) {
      const name    = projects[i];
      const comp    = data.completionByProject[i];
      const volume  = volumeMap.get(name) ?? 0;
      const overdue = data.overdueByProject.find(r => r.name === name)?.overdue ?? 0;
      const overdueRate = volume > 0 ? Math.round((overdue / volume) * 100) : 0;
      const pendingH    = pendingHoursMap.get(name) ?? 0;
      const overdueH    = overdueHoursMap.get(name) ?? 0;
      const deliveryRisk = pendingH > 0 ? Math.round((overdueH / pendingH) * 100) : 0;
      const sprint       = sprintMap.get(name);
      const sprintTotal  = sprint ? sprint.active + sprint.terminal : 0;
      const sprintComp   = sprintTotal > 0 ? Math.round((sprint!.terminal / sprintTotal) * 100) : 0;
      const pressure     = pressureMap.get(name);
      const fte          = fteMap.get(name) ?? 0;

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(247, 248, 252);
        doc.rect(margin, y, contentW, rowH, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 60);

      const allCellDefs = [
        { metric: undefined,          value: name.length > 20 ? name.slice(0, 18) + '…' : name, risk: false },
        { metric: 'completion',       value: `${comp.rate}%`,                                    risk: false },
        { metric: 'overdue_rate',     value: overdueRate > 0 ? `${overdueRate}% (${overdue})` : '—', risk: overdueRate >= 40 },
        { metric: 'delivery_risk',    value: deliveryRisk > 0 ? `${deliveryRisk}%` : '—',        risk: deliveryRisk >= 50 },
        { metric: 'sprint_completion',value: sprintTotal > 0 ? `${sprintComp}% (${sprint!.terminal}/${sprintTotal})` : '—', risk: false },
        { metric: 'backlog_pressure', value: pressure ? `${pressure.weightedScore} (${pressure.avgDays}d)` : '—', risk: false },
        { metric: 'fte',              value: fte > 0 ? `${fte}` : '—',                           risk: false },
      ].filter(c => !c.metric || has(c.metric));

      cx = margin + 5;
      for (let c = 0; c < colDefs.length; c++) {
        doc.setTextColor(allCellDefs[c].risk ? 200 : 40, allCellDefs[c].risk ? 30 : 40, allCellDefs[c].risk ? 30 : 60);
        doc.text(allCellDefs[c].value, cx, y + 12);
        cx += colDefs[c].w;
      }
      y += rowH;
    }

    // Bottom border
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 20;
  }
  } // end if (data)

  // ── AI Narrative ─────────────────────────────────────────────────────────
  // Strip markdown formatting Gemini may output despite instructions
  const stripMd = (s: string) =>
    s.replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
     .replace(/\*([^*]+)\*/g, '$1')       // *italic*
     .replace(/^#+\s*/, '')               // # headings
     .trim();

  const lines = reportText.split('\n');

  for (const rawLine of lines) {
    const line = stripMd(rawLine);

    const isHeader = /^\d+\.\s/.test(line) && line.length < 80;

    if (isHeader) {
      checkY(26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(10, 8, 56);
      doc.text(line, margin, y);
      y += 16;

      doc.setDrawColor(10, 8, 56);
      doc.setLineWidth(0.5);
      doc.line(margin, y - 3, margin + contentW, y - 3);
      y += 6;
      continue;
    }

    if (line === '') {
      y += 6;
      continue;
    }

    const isBullet = line.startsWith('-') || line.startsWith('•');
    const indent    = isBullet ? margin + 12 : margin;
    const textWidth = isBullet ? contentW - 12 : contentW;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 60);

    const wrapped = doc.splitTextToSize(
      isBullet ? `• ${line.replace(/^[-•]\s*/, '')}` : line,
      textWidth,
    );

    checkY(wrapped.length * 13 + 4);
    doc.text(wrapped, indent, y);
    y += wrapped.length * 13 + 3;
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 180);
    doc.text(
      `Page ${p} of ${totalPages}  •  Generated by Jixology  •  ${new Date().toLocaleDateString()}`,
      pageW / 2,
      pageH - 24,
      { align: 'center' },
    );
  }

  return doc;
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function generateAndDownloadWeeklyReport(
  rawData: AdminDashboardData,
  userId: number,
  config: ReportConfig,
): Promise<void> {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let monday: Date;
  let dateLabel: string;
  let filteredData: AdminDashboardData;

  if (config.type === 'custom' && config.startDate && config.endDate) {
    monday    = config.startDate;
    dateLabel = `${fmt(config.startDate)} – ${fmt(config.endDate)}`;
    filteredData = config.projectNames?.length
      ? filterData(rawData, config.projectNames)
      : rawData;
  } else {
    const week = currentWorkWeek();
    monday       = week.monday;
    dateLabel    = `${fmt(week.monday)} – ${fmt(week.friday)}`;
    filteredData = rawData;
  }

  const metrics   = config.type === 'custom' ? config.metrics : undefined;
  const dateStamp = localDateString(monday);
  const baseName  = config.nombre?.trim() || (config.type === 'custom' ? 'Reporte_Personalizado' : 'Reporte_Semanal');
  const nombre    = `${baseName}_${dateStamp}`;

  const reportText = await callGemini(buildPrompt(filteredData, dateLabel, metrics));

  const visibilidad = config.type === 'custom' ? (config.visibilidad ?? 'privado') : 'publico';
  const reportId = await saveReport(reportText, monday, userId, nombre, visibilidad);
  await linkCheckIns(reportId, monday);

  const pdf = buildPdf(reportText, dateLabel, filteredData, metrics);
  pdf.save(`${nombre}.pdf`);
}
