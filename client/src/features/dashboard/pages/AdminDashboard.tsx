import { useState, useRef, useEffect, type FC } from 'react';
import { useDashboardPanel } from '../hooks/useDashboardPanel';
import DashboardGrid from '../components/DashboardGrid/DashboardGrid';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useAdminDashboardData } from '../hooks/useAdminDashboardData';
import type {
  ProjectStatusSlice,
  GlobalItemStatusSlice,
  ProjectCompletionRow,
  ProjectVolumeRow,
  SprintHealthRow,
  FteProjectRow,
  WeeklyProgressData,
  OverdueProjectRow,
  BacklogPressureRow,
  BacklogItemDetail,
  EstimatedHoursProjectRow,
  HoursDonePendingRow,
  OverdueHoursProjectRow,
  HoursByPriorityRow,
  HoursByTypeRow,
  AvgHoursComplexityRow,
} from '../hooks/useAdminDashboardData';
import { useWeeklyReport } from '../hooks/useWeeklyReport';
import { useVisibleGraphs } from '../hooks/useVisibleGraphs';
import type { GraphDescriptor } from '../config/graphCatalog';
import GenerateReportModal from '../components/GenerateReportModal/GenerateReportModal';
import CustomizePanel from '../components/CustomizePanel/CustomizePanel';
import chartStyles from '../components/ChartCard.module.css';
import styles from './AdminDashboard.module.css';

// ── Shared tooltip style ───────────────────────────────────────────────
const TOOLTIP_STYLE = { fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' };
const TICK_PROPS    = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };
const LEGEND_STYLE  = { fontSize: '0.72rem', fontFamily: 'Poppins, sans-serif' };
const AXIS_LABEL    = { style: { fontSize: '0.7rem', fontFamily: 'Poppins, sans-serif', fill: 'var(--color-anchor-gray-1)' } };

// Drops project rows not in `filter`. If `filter` is undefined, returns the
// data unchanged — admin dashboards pass undefined and see everything.
function applyProjectFilter<T extends { id: number }>(data: T[], filter?: Set<number>): T[] {
  if (!filter) return data;
  return data.filter(r => filter.has(r.id));
}

// ── Weekly progress card ───────────────────────────────────────────────
function getTodayIndex(): number {
  const d = new Date().getDay(); // 0=Sun,1=Mon…6=Sat
  return d >= 1 && d <= 5 ? d : 0; // 1=Mon…5=Fri, 0=weekend
}

const WeeklyProgressCard: FC<{ data: WeeklyProgressData }> = ({ data }) => {
  const todayIndex = getTodayIndex();

  return (
    <div className={styles.weeklyCard}>
      <div className={styles.weeklyHeader}>
        <span className={styles.weeklyTitle}>Progresión Semanal</span>
        <span className={styles.weeklyPct}>{data.rate}%</span>
      </div>

      <div className={styles.weeklyBarWrapper}>
        <div className={styles.weeklyBarTrack}>
          <div className={styles.weeklyBarFill} style={{ width: `${data.rate}%` }} />
        </div>
        {[20, 40, 60, 80].map(pct => (
          <div key={pct} className={styles.weeklyDayTick} style={{ left: `${pct}%` }} />
        ))}
        {todayIndex > 0 && (
          <div className={styles.weeklyTodayTick} style={{ left: `${todayIndex * 20}%` }} />
        )}
      </div>

      <span className={styles.weeklySubLabel}>
        {data.total === 0
          ? 'Sin ítems con vencimiento esta semana'
          : `${data.completed} / ${data.total} ítems completados esta semana`}
      </span>

      {data.byProject.length > 0 && (
        <div className={styles.weeklyProjectList}>
          {data.byProject.map(row => (
            <div key={row.name} className={styles.weeklyProjectRow}>
              <span className={styles.weeklyProjectName} title={row.name}>{row.name}</span>
              <div className={styles.weeklyProjectBarWrapper}>
                <div className={styles.weeklyProjectBarTrack}>
                  <div className={styles.weeklyProjectBarFill} style={{ width: `${row.rate}%` }} />
                </div>
                {[20, 40, 60, 80].map(pct => (
                  <div key={pct} className={styles.weeklyProjectDayTick} style={{ left: `${pct}%` }} />
                ))}
                {todayIndex > 0 && (
                  <div className={styles.weeklyProjectTodayTick} style={{ left: `${todayIndex * 20}%` }} />
                )}
              </div>
              <span className={styles.weeklyProjectMeta}>{row.completed}/{row.total}</span>
              <span className={styles.weeklyProjectPct}>{row.rate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Project status donut ───────────────────────────────────────────────
const ProjectStatusDonut: FC<{ data: ProjectStatusSlice[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Estado de proyectos</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);

// ── Global item status donut ───────────────────────────────────────────
const GlobalItemStatusDonut: FC<{ data: GlobalItemStatusSlice[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Distribución de ítems por estado</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);

// ── Completion rate per project (custom bar) ───────────────────────────
export const CompletionRateCard: FC<{ data: ProjectCompletionRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Tasa de completación por proyecto</h3>
      {rows.length === 0 ? (
        <p className={chartStyles.empty}>Sin datos</p>
      ) : (
        <div className={styles.completionList}>
          {rows.map(row => (
            <div key={row.name} className={styles.completionRow}>
              <span className={styles.completionLabel} title={row.name}>{row.name}</span>
              <div className={styles.completionBarTrack}>
                <div
                  className={styles.completionBarFill}
                  style={{ width: `${row.rate}%` }}
                />
              </div>
              <span className={styles.completionPct}>{row.rate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Backlog volume per project ─────────────────────────────────────────
export const VolumeByProjectBar: FC<{ data: ProjectVolumeRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Volumen de backlog por proyecto</h3>
    {rows.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 4, right: 16, left: 20, bottom: 55 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="name"
            tick={{ ...TICK_PROPS, width: 80 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={TICK_PROPS} allowDecimals={false}>
            <Label value="Ítems" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
          </YAxis>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Ítems" fill="#0A0838" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
  );
};

// ── Sprint health per project ──────────────────────────────────────────
export const SprintHealthBar: FC<{ data: SprintHealthRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Salud de sprints por proyecto</h3>
    {rows.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 24, right: 16, left: 20, bottom: 55 }} barCategoryGap="25%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="name"
            tick={{ ...TICK_PROPS, width: 80 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={TICK_PROPS} allowDecimals={false}>
            <Label value="Sprints" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
          </YAxis>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} verticalAlign="top" wrapperStyle={{ ...LEGEND_STYLE, paddingBottom: 4 }} />
          <Bar dataKey="active"   name="Activos"     fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="terminal" name="Terminados"  fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
  );
};

// ── Overdue items by project ───────────────────────────────────────────
export const OverdueByProjectCard: FC<{ data: OverdueProjectRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Ítems vencidos por proyecto</h3>
    {rows.length === 0 ? (
      <p className={chartStyles.empty}>Sin ítems vencidos</p>
    ) : (
      <div className={styles.overdueList}>
        {rows.map((row, i) => (
          <div key={row.name} className={styles.overdueRow}>
            <span className={styles.overdueRank}>{i + 1}</span>
            <span className={styles.overdueName} title={row.name}>{row.name}</span>
            <span className={styles.overdueBadge}>{row.overdue}</span>
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

// ── Shared complexity colour scale ────────────────────────────────────
const COMPLEXITY_COLORS = ['', '#fef08a', '#fde047', '#fb923c', '#f87171', '#dc2626'];
function complexityColor(c: number) {
  return COMPLEXITY_COLORS[Math.max(1, Math.min(5, Math.round(c)))];
}

// ── A: Weighted risk score ─────────────────────────────────────────────
export const WeightedRiskCard: FC<{ data: BacklogPressureRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  const max = Math.max(...rows.map(r => r.weightedScore), 1);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Riesgo ponderado</h3>
      <p className={styles.pressureSubtitle}>Σ (días vencido × complejidad) por proyecto</p>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin ítems vencidos</p> : (
        <div className={styles.pressureList}>
          {rows.map(row => (
            <div key={row.name} className={styles.pressureRow}>
              <span className={styles.pressureName} title={row.name}>{row.name}</span>
              <div className={styles.pressureBarTrack}>
                <div className={styles.weightedBarFill} style={{ width: `${(row.weightedScore / max) * 100}%` }} />
              </div>
              <span className={styles.weightedScoreLabel}>{row.weightedScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── B: Segmented composition bar ──────────────────────────────────────
export const SegmentedBacklogCard: FC<{ data: BacklogPressureRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  const maxDebt = Math.max(...rows.map(r => r.debtDays), 1);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Composición de deuda</h3>
      <p className={styles.pressureSubtitle}>Cada segmento = 1 ítem · ancho = días · color = complejidad</p>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin ítems vencidos</p> : (
        <div className={styles.pressureList}>
          {rows.map(row => (
            <div key={row.name} className={styles.pressureRow}>
              <span className={styles.pressureName} title={row.name}>{row.name}</span>
              <div className={styles.segmentedTrack}>
                {row.items.map((item: BacklogItemDetail, i: number) => (
                  <div
                    key={i}
                    className={styles.segmentedSegment}
                    style={{ width: `${(item.days / maxDebt) * 100}%`, background: complexityColor(item.complejidad) }}
                    title={`${item.days}d · complejidad ${item.complejidad}`}
                  />
                ))}
              </div>
              <span className={styles.pressureDaysBadge}>{row.count}i</span>
            </div>
          ))}
          <div className={styles.complexityLegend}>
            {[1, 2, 3, 4, 5].map(c => (
              <span key={c} className={styles.complexityLegendItem}>
                <span className={styles.complexityLegendSwatch} style={{ background: COMPLEXITY_COLORS[c] }} />
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── C: Bubble chart (avg days vs avg complexity, size = count) ─────────
const BubbleTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: BacklogPressureRow }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#0A0838' }}>{d.name}</p>
      <p style={{ margin: '2px 0' }}>Días promedio: <b>{d.avgDays}</b></p>
      <p style={{ margin: '2px 0' }}>Complejidad promedio: <b>{d.avgComplexity}</b></p>
      <p style={{ margin: '2px 0' }}>Ítems vencidos: <b>{d.count}</b></p>
    </div>
  );
};

// Label offsets so dots at similar coords don't print their names on top of each other
const BUBBLE_LABEL_OFFSETS = [
  { dx: 0,   dy: -1 },  // above
  { dx: 0,   dy:  1 },  // below
  { dx: -1,  dy: -1 },  // above-left
  { dx:  1,  dy:  1 },  // below-right
];

const BubbleDot = (props: { cx?: number; cy?: number; index?: number; payload?: BacklogPressureRow }) => {
  const { cx = 0, cy = 0, index = 0, payload } = props;
  if (!payload) return null;
  const r   = Math.max(8, Math.min(22, payload.count * 5));
  const off = BUBBLE_LABEL_OFFSETS[index % BUBBLE_LABEL_OFFSETS.length];
  const lx  = cx + off.dx * (r + 14);
  const ly  = cy + off.dy * (r + 12);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#f59e0b" opacity={0.75} />
      <text x={lx} y={ly} textAnchor="middle" fontSize={10} fontFamily="Poppins, sans-serif" fill="#0A0838" fontWeight={500}>
        {payload.name.replace('Proyecto ', '')}
      </text>
    </g>
  );
};

export const BubblePressureCard: FC<{ data: BacklogPressureRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const available = applyProjectFilter(data, projectFilter);
  const allNames = available.map(r => r.name);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allNames));
  const [open, setOpen]         = useState(false);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Reset internal selection when the external filter changes the available set
  useEffect(() => {
    setSelected(new Set(available.map(r => r.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  const allSelected = selected.size === allNames.length;

  const toggle = (name: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allNames));

  const btnLabel = allSelected
    ? 'Todos los proyectos'
    : selected.size === 0 ? 'Ningún proyecto'
    : selected.size === 1 ? [...selected][0]
    : `${selected.size} proyectos`;

  const filtered = available.filter(r => selected.has(r.name));

  return (
    <div className={chartStyles.card}>
      <div className={styles.bubbleCardHeader}>
        <div>
          <h3 className={chartStyles.title}>Tipo de problema (burbuja)</h3>
          <p className={styles.pressureSubtitle}>X = días promedio · Y = complejidad promedio · tamaño = nº ítems</p>
        </div>
        <div className={styles.bubbleDropdownWrapper} ref={wrapperRef}>
          <button className={styles.bubbleDropdownBtn} onClick={() => setOpen(o => !o)}>
            {btnLabel}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {open && (
            <div className={styles.bubbleDropdownMenu}>
              <label className={styles.bubbleDropdownItemAll}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className={styles.bubbleDropdownCheckbox} />
                Todos los proyectos
              </label>
              <div className={styles.bubbleDropdownDivider} />
              {available.map(row => (
                <label key={row.name} className={styles.bubbleDropdownItem}>
                  <input type="checkbox" checked={selected.has(row.name)} onChange={() => toggle(row.name)} className={styles.bubbleDropdownCheckbox} />
                  {row.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {available.length === 0 ? <p className={chartStyles.empty}>Sin ítems vencidos</p> : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 28, right: 28, bottom: 28, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
              <XAxis
                dataKey="avgDays"
                type="number"
                name="Días promedio"
                tick={TICK_PROPS}
                domain={[(min: number) => Math.max(0, min - 2), (max: number) => max + 2]}
              >
                <Label value="Días promedio vencido" position="insideBottom" offset={-14} {...AXIS_LABEL} />
              </XAxis>
              <YAxis
                dataKey="avgComplexity"
                type="number"
                name="Complejidad"
                tick={TICK_PROPS}
                domain={[(min: number) => Math.max(0, Math.floor(min) - 1), (max: number) => Math.ceil(max) + 1]}
              >
                <Label value="Complejidad prom." angle={-90} position="insideLeft" offset={-4} {...AXIS_LABEL} />
              </YAxis>
              <Tooltip content={<BubbleTooltip />} />
              <Scatter
                data={filtered}
                shape={(p: { cx?: number; cy?: number; index?: number; payload?: BacklogPressureRow }) => <BubbleDot {...p} />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

// ── D: Risk matrix quadrant ────────────────────────────────────────────
const MatrixTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: BacklogPressureRow }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#0A0838' }}>{d.name}</p>
      <p style={{ margin: '2px 0' }}>Días de deuda: <b>{d.debtDays}</b></p>
      <p style={{ margin: '2px 0' }}>Complejidad total: <b>{d.complexitySum}</b></p>
      <p style={{ margin: '2px 0' }}>Riesgo ponderado: <b>{d.weightedScore}</b></p>
    </div>
  );
};

const MatrixDot = (props: { cx?: number; cy?: number; payload?: BacklogPressureRow }) => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#E31837" opacity={0.85} />
      <text x={cx} y={cy - 11} textAnchor="middle" fontSize={10} fontFamily="Poppins, sans-serif" fill="#0A0838" fontWeight={500}>
        {payload.name.replace('Proyecto ', '')}
      </text>
    </g>
  );
};

export const RiskMatrixCard: FC<{ data: BacklogPressureRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const available = applyProjectFilter(data, projectFilter);
  const allNames  = available.map(r => r.name);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allNames));
  const [open, setOpen]         = useState(false);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setSelected(new Set(available.map(r => r.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  const allSelected = selected.size === allNames.length;

  const toggle = (name: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allNames));

  const btnLabel = allSelected
    ? 'Todos los proyectos'
    : selected.size === 0 ? 'Ningún proyecto'
    : selected.size === 1 ? [...selected][0]
    : `${selected.size} proyectos`;

  const filtered = available.filter(r => selected.has(r.name));
  const midX = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.debtDays, 0) / filtered.length) : 0;
  const midY = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.complexitySum, 0) / filtered.length) : 0;

  return (
    <div className={chartStyles.card}>
      <div className={styles.bubbleCardHeader}>
        <div>
          <h3 className={chartStyles.title}>Matriz de riesgo</h3>
          <p className={styles.pressureSubtitle}>X = días de deuda total · Y = complejidad total · líneas = promedio</p>
        </div>
        <div className={styles.bubbleDropdownWrapper} ref={wrapperRef}>
          <button className={styles.bubbleDropdownBtn} onClick={() => setOpen(o => !o)}>
            {btnLabel}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {open && (
            <div className={styles.bubbleDropdownMenu}>
              <label className={styles.bubbleDropdownItemAll}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className={styles.bubbleDropdownCheckbox} />
                Todos los proyectos
              </label>
              <div className={styles.bubbleDropdownDivider} />
              {available.map(row => (
                <label key={row.name} className={styles.bubbleDropdownItem}>
                  <input type="checkbox" checked={selected.has(row.name)} onChange={() => toggle(row.name)} className={styles.bubbleDropdownCheckbox} />
                  {row.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {available.length === 0 ? <p className={chartStyles.empty}>Sin ítems vencidos</p> : (
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 24, right: 24, bottom: 28, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
            <XAxis dataKey="debtDays" type="number" name="Días de deuda" tick={TICK_PROPS}>
              <Label value="Días de deuda total" position="insideBottom" offset={-14} {...AXIS_LABEL} />
            </XAxis>
            <YAxis dataKey="complexitySum" type="number" name="Complejidad total" tick={TICK_PROPS}>
              <Label value="Complejidad total" angle={-90} position="insideLeft" offset={-4} {...AXIS_LABEL} />
            </YAxis>
            <ReferenceLine x={midX} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: 'media X', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }} />
            <ReferenceLine y={midY} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: 'media Y', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }} />
            <Tooltip content={<MatrixTooltip />} />
            <Scatter data={filtered} shape={(p: { cx?: number; cy?: number; payload?: BacklogPressureRow }) => <MatrixDot {...p} />} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Backlog pressure card ──────────────────────────────────────────────
export const BacklogPressureCard: FC<{ data: BacklogPressureRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  const maxDebt = Math.max(...rows.map(r => r.debtDays), 1);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Presión de backlog</h3>
      <div className={styles.pressureLegend}>
        <span className={styles.pressureLegendDays}>días de deuda</span>
        <span className={styles.pressureLegendComplexity}>complejidad</span>
      </div>
      {rows.length === 0 ? (
        <p className={chartStyles.empty}>Sin ítems vencidos</p>
      ) : (
        <div className={styles.pressureList}>
          {rows.map(row => (
            <div key={row.name} className={styles.pressureRow}>
              <span className={styles.pressureName} title={row.name}>{row.name}</span>
              <div className={styles.pressureBarTrack}>
                <div
                  className={styles.pressureBarFill}
                  style={{ width: `${(row.debtDays / maxDebt) * 100}%` }}
                />
              </div>
              <span className={styles.pressureDaysBadge}>{row.debtDays}d</span>
              <span className={styles.pressureComplexityBadge}>{row.complexitySum}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── FTE by project ─────────────────────────────────────────────────────
export const FteByProjectBar: FC<{ data: FteProjectRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>FTE asignado por proyecto</h3>
    {rows.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 4, right: 16, left: 20, bottom: 55 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis
            dataKey="name"
            tick={{ ...TICK_PROPS, width: 80 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={TICK_PROPS}>
            <Label value="FTE" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
          </YAxis>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} FTE`, 'FTE']} />
          <Bar dataKey="fte" name="FTE" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
  );
};

// ── Estimated hours per project ───────────────────────────────────────
export const EstimatedHoursByProjectBar: FC<{ data: EstimatedHoursProjectRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Horas estimadas por proyecto</h3>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin datos</p> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" horizontal={false} />
            <XAxis type="number" tick={TICK_PROPS} unit="h" />
            <YAxis type="category" dataKey="name" tick={{ ...TICK_PROPS, width: 90 }} width={90} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}h`, 'Horas estimadas']} />
            <Bar dataKey="hours" name="Horas estimadas" fill="#3b82f6" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Hours done vs. pending per project ────────────────────────────────
export const HoursDonePendingBar: FC<{ data: HoursDonePendingRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Horas completadas vs. pendientes</h3>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin datos</p> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 24, right: 16, left: 20, bottom: 55 }} barCategoryGap="25%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
            <XAxis dataKey="name" tick={{ ...TICK_PROPS, width: 80 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={TICK_PROPS} unit="h">
              <Label value="Horas" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
            </YAxis>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}h`]} />
            <Legend iconType="circle" iconSize={8} verticalAlign="top" wrapperStyle={{ ...LEGEND_STYLE, paddingBottom: 4 }} />
            <Bar dataKey="done"    name="Completadas" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="pending" name="Pendientes"  fill="#0A0838" radius={[3, 3, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Overdue hours per project ──────────────────────────────────────────
export const OverdueHoursByProjectBar: FC<{ data: OverdueHoursProjectRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Horas en deuda por proyecto</h3>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin horas en deuda</p> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 4, right: 16, left: 20, bottom: 55 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
            <XAxis dataKey="name" tick={{ ...TICK_PROPS, width: 80 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={TICK_PROPS} unit="h">
              <Label value="Horas" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
            </YAxis>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}h`, 'Horas en deuda']} />
            <Bar dataKey="hours" name="Horas en deuda" fill="#E31837" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Hours by priority ──────────────────────────────────────────────────
export const HoursByPriorityBar: FC<{ data: HoursByPriorityRow[]; projectFilter?: Set<number> }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Horas estimadas por prioridad</h3>
    {data.length === 0 ? <p className={chartStyles.empty}>Sin datos</p> : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 20, bottom: 16 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
          <XAxis dataKey="prioridad" tick={TICK_PROPS} />
          <YAxis tick={TICK_PROPS} unit="h">
            <Label value="Horas" angle={-90} position="insideLeft" offset={-8} {...AXIS_LABEL} />
          </YAxis>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}h`, 'Horas estimadas']} />
          <Bar dataKey="hours" name="Horas" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
);

// ── Hours by item type donut ───────────────────────────────────────────
export const HoursByTypeDonut: FC<{ data: HoursByTypeRow[]; projectFilter?: Set<number> }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Horas estimadas por tipo de ítem</h3>
    {data.length === 0 ? <p className={chartStyles.empty}>Sin datos</p> : (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="hours"
            nameKey="tipo"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v}h`, n]} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);

// ── Avg hours vs. avg complexity scatter (admin-only) ─────────────────
const AvgHoursComplexityTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: AvgHoursComplexityRow }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#0A0838' }}>{d.name}</p>
      <p style={{ margin: '2px 0' }}>Horas promedio: <b>{d.avgHours}h</b></p>
      <p style={{ margin: '2px 0' }}>Complejidad promedio: <b>{d.avgComplexity}</b></p>
      <p style={{ margin: '2px 0' }}>Ítems: <b>{d.count}</b></p>
    </div>
  );
};

const AvgHoursComplexityDot = (props: { cx?: number; cy?: number; payload?: AvgHoursComplexityRow }) => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#8b5cf6" opacity={0.85} />
      <text x={cx} y={cy - 11} textAnchor="middle" fontSize={10} fontFamily="Poppins, sans-serif" fill="#0A0838" fontWeight={500}>
        {payload.name.replace('Proyecto ', '')}
      </text>
    </g>
  );
};

export const AvgHoursVsComplexityScatter: FC<{ data: AvgHoursComplexityRow[]; projectFilter?: Set<number> }> = ({ data, projectFilter }) => {
  const rows = applyProjectFilter(data, projectFilter);
  const midX = rows.length ? Math.round(rows.reduce((s, r) => s + r.avgComplexity, 0) / rows.length * 10) / 10 : 0;
  const midY = rows.length ? Math.round(rows.reduce((s, r) => s + r.avgHours, 0) / rows.length * 10) / 10 : 0;
  return (
    <div className={chartStyles.card}>
      <h3 className={chartStyles.title}>Horas promedio vs. complejidad</h3>
      <p className={styles.pressureSubtitle}>X = complejidad promedio · Y = horas promedio estimadas por proyecto</p>
      {rows.length === 0 ? <p className={chartStyles.empty}>Sin datos</p> : (
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 24, right: 24, bottom: 28, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-clarity-gray-2)" />
            <XAxis dataKey="avgComplexity" type="number" name="Complejidad" tick={TICK_PROPS} domain={[0.5, 5.5]} ticks={[1,2,3,4,5]}>
              <Label value="Complejidad promedio" position="insideBottom" offset={-14} {...AXIS_LABEL} />
            </XAxis>
            <YAxis dataKey="avgHours" type="number" name="Horas" tick={TICK_PROPS} unit="h">
              <Label value="Horas promedio" angle={-90} position="insideLeft" offset={-4} {...AXIS_LABEL} />
            </YAxis>
            <ReferenceLine x={midX} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: `x̄ comp ${midX}`, position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }} />
            <ReferenceLine y={midY} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: `x̄ ${midY}h`, position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontFamily: 'Poppins, sans-serif' }} />
            <Tooltip content={<AvgHoursComplexityTooltip />} />
            <Scatter data={rows} shape={(p: { cx?: number; cy?: number; payload?: AvgHoursComplexityRow }) => <AvgHoursComplexityDot {...p} />} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── Catalog-driven graph renderer ──────────────────────────────────────
// Each catalog `id` maps to its component + data slice. Returns null for
// unknown IDs (would indicate a stale or mistyped catalog entry).
function renderGraph(
  g:  GraphDescriptor,
  d:  ReturnType<typeof useAdminDashboardData>['data'] extends infer T ? T extends null ? never : T : never,
  pf: Set<number> | undefined,
) {
  switch (g.id) {
    case 'completion_rate':      return <CompletionRateCard    data={d.completionByProject} projectFilter={pf} />;
    case 'overdue_by_project':   return <OverdueByProjectCard  data={d.overdueByProject}    projectFilter={pf} />;
    case 'backlog_pressure':     return <BacklogPressureCard   data={d.backlogPressure}     projectFilter={pf} />;
    case 'weighted_risk':        return <WeightedRiskCard      data={d.backlogPressure}     projectFilter={pf} />;
    case 'segmented_backlog':    return <SegmentedBacklogCard  data={d.backlogPressure}     projectFilter={pf} />;
    case 'bubble_pressure':      return <BubblePressureCard    data={d.backlogPressure}     projectFilter={pf} />;
    case 'risk_matrix':          return <RiskMatrixCard        data={d.backlogPressure}     projectFilter={pf} />;
    case 'project_status_donut': return <ProjectStatusDonut    data={d.projectStatus}        />;
    case 'item_status_donut':    return <GlobalItemStatusDonut data={d.globalItemStatus}     />;
    case 'volume_by_project':    return <VolumeByProjectBar    data={d.volumeByProject}     projectFilter={pf} />;
    case 'fte_by_project':       return <FteByProjectBar       data={d.fteByProject}        projectFilter={pf} />;
    case 'sprint_health':               return <SprintHealthBar            data={d.sprintHealth}            projectFilter={pf} />;
    case 'estimated_hours_by_project':  return <EstimatedHoursByProjectBar data={d.estimatedHoursByProject} projectFilter={pf} />;
    case 'hours_done_vs_pending':       return <HoursDonePendingBar        data={d.hoursDonePending}        projectFilter={pf} />;
    case 'overdue_hours_by_project':    return <OverdueHoursByProjectBar   data={d.overdueHoursByProject}   projectFilter={pf} />;
    case 'hours_by_priority':           return <HoursByPriorityBar         data={d.hoursByPriority}         projectFilter={pf} />;
    case 'hours_by_item_type':          return <HoursByTypeDonut           data={d.hoursByType}             projectFilter={pf} />;
    case 'avg_hours_vs_complexity':     return <AvgHoursVsComplexityScatter data={d.avgHoursVsComplexity}  projectFilter={pf} />;
    default:                            return null;
  }
}

// Export so UserDashboard can reuse the same render logic for PM-extended graphs
// eslint-disable-next-line react-refresh/only-export-components
export { renderGraph as renderAdminGraph };

// ── Page ───────────────────────────────────────────────────────────────
const AdminDashboard: FC = () => {
  const { data, loading, error } = useAdminDashboardData();
  const { state: reportState, errorMsg: reportError, generate } = useWeeklyReport(data);
  const [showReportModal, setShowReportModal] = useState(
    () => sessionStorage.getItem('reportModalOpen') === 'true',
  );
  const { open: showCustomizePanel, openPanel: openCustomizePanel, closePanel: closeCustomizePanel } = useDashboardPanel('admin');
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[] | null>(null);
  const { visible, available, toggle, isVisible, getLayoutItems, saveLayout } = useVisibleGraphs('admin');

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>Cargando dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>Error al cargar los datos: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const allProjects = data.completionByProject.map(r => ({ id: r.id, nombre: r.name }));
  const projectFilter: Set<number> | undefined =
    selectedProjectIds && selectedProjectIds.length > 0
      ? new Set(selectedProjectIds)
      : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.title}>Dashboard administrativo</p>
            <p className={styles.subtitle}>Salud global de todos los proyectos</p>
          </div>
          <div className={styles.reportActions}>
            <button
              className={styles.customizeBtn}
              onClick={openCustomizePanel}
              aria-label="Personalizar dashboard"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 7h12M4 13h12M8 4v6M12 10v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Personalizar
            </button>
            <button
              className={styles.reportBtn}
              onClick={() => { setShowReportModal(true); sessionStorage.setItem('reportModalOpen', 'true'); }}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2v10m0 0l-3-3m3 3l3-3M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Generar reporte
            </button>
          </div>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statsGroup}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.activeProjects}</div>
            <div className={styles.statLabel}>Proyectos activos</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.totalItems}</div>
            <div className={styles.statLabel}>Ítems totales</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {data.sprintHealth.reduce((s, r) => s + r.active, 0)}
            </div>
            <div className={styles.statLabel}>Sprints activos</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValueRed}>
              {data.overdueByProject.reduce((s, r) => s + r.overdue, 0)}
            </div>
            <div className={styles.statLabel}>Ítems vencidos</div>
          </div>
        </div>
        <WeeklyProgressCard data={data.weeklyProgress} />
      </div>

      <DashboardGrid
        visible={visible}
        getLayoutItems={getLayoutItems}
        saveLayout={saveLayout}
        showCustomizePanel={showCustomizePanel}
        renderItem={g => renderGraph(g, data, projectFilter)}
      />

      {showReportModal && (
        <GenerateReportModal
          data={data}
          state={reportState}
          errorMsg={reportError}
          onGenerate={config => { generate(config); }}
          onClose={() => { setShowReportModal(false); sessionStorage.removeItem('reportModalOpen'); }}
        />
      )}

      <CustomizePanel
        open={showCustomizePanel}
        onClose={closeCustomizePanel}
        available={available}
        isVisible={isVisible}
        toggle={toggle}
        showBadge={false}
        projects={allProjects.length > 1 ? allProjects : undefined}
        selectedProjectIds={selectedProjectIds}
        onProjectChange={setSelectedProjectIds}
      />
    </div>
  );
};

export default AdminDashboard;
