import type { FC } from 'react';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
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
} from '../hooks/useAdminDashboardData';
import { useWeeklyReport } from '../hooks/useWeeklyReport';
import chartStyles from '../components/ChartCard.module.css';
import styles from './AdminDashboard.module.css';

// ── Shared tooltip style ───────────────────────────────────────────────
const TOOLTIP_STYLE = { fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif' };
const TICK_PROPS    = { fontSize: 11, fontFamily: 'Poppins, sans-serif' };
const LEGEND_STYLE  = { fontSize: '0.72rem', fontFamily: 'Poppins, sans-serif' };
const AXIS_LABEL    = { style: { fontSize: '0.7rem', fontFamily: 'Poppins, sans-serif', fill: 'var(--color-anchor-gray-1)' } };

// ── Weekly progress card ───────────────────────────────────────────────
const WeeklyProgressCard: FC<{ data: WeeklyProgressData }> = ({ data }) => (
  <div className={styles.weeklyCard}>
    <div className={styles.weeklyHeader}>
      <span className={styles.weeklyTitle}>Progresión Semanal</span>
      <span className={styles.weeklyPct}>{data.rate}%</span>
    </div>
    <div className={styles.weeklyBarTrack}>
      <div className={styles.weeklyBarFill} style={{ width: `${data.rate}%` }} />
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
            <div className={styles.weeklyProjectBarTrack}>
              <div className={styles.weeklyProjectBarFill} style={{ width: `${row.rate}%` }} />
            </div>
            <span className={styles.weeklyProjectMeta}>{row.completed}/{row.total}</span>
            <span className={styles.weeklyProjectPct}>{row.rate}%</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

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
const CompletionRateCard: FC<{ data: ProjectCompletionRow[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Tasa de completación por proyecto</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <div className={styles.completionList}>
        {data.map(row => (
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

// ── Backlog volume per project ─────────────────────────────────────────
const VolumeByProjectBar: FC<{ data: ProjectVolumeRow[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Volumen de backlog por proyecto</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 20, bottom: 55 }} barCategoryGap="30%">
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

// ── Sprint health per project ──────────────────────────────────────────
const SprintHealthBar: FC<{ data: SprintHealthRow[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Salud de sprints por proyecto</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 24, right: 16, left: 20, bottom: 55 }} barCategoryGap="25%" barGap={2}>
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

// ── Overdue items by project ───────────────────────────────────────────
const OverdueByProjectCard: FC<{ data: OverdueProjectRow[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>Ítems vencidos por proyecto</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin ítems vencidos</p>
    ) : (
      <div className={styles.overdueList}>
        {data.map((row, i) => (
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

// ── FTE by project ─────────────────────────────────────────────────────
const FteByProjectBar: FC<{ data: FteProjectRow[] }> = ({ data }) => (
  <div className={chartStyles.card}>
    <h3 className={chartStyles.title}>FTE asignado por proyecto</h3>
    {data.length === 0 ? (
      <p className={chartStyles.empty}>Sin datos</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 20, bottom: 55 }} barCategoryGap="30%">
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

// ── Page ───────────────────────────────────────────────────────────────
const AdminDashboard: FC = () => {
  const { data, loading, error } = useAdminDashboardData();
  const { state: reportState, errorMsg: reportError, generate } = useWeeklyReport(data);

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
              className={styles.reportBtn}
              onClick={generate}
              disabled={reportState === 'loading'}
            >
              {reportState === 'loading' ? (
                <>
                  <span className={styles.reportSpinner} />
                  Generando…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 2v10m0 0l-3-3m3 3l3-3M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reporte semanal
                </>
              )}
            </button>
            {reportState === 'error' && reportError && (
              <span className={styles.reportErrorMsg} title={reportError}>
                Error al generar reporte
              </span>
            )}
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

      <div className={styles.grid}>
        <CompletionRateCard    data={data.completionByProject} />
        <OverdueByProjectCard  data={data.overdueByProject} />
        <ProjectStatusDonut    data={data.projectStatus} />
        <GlobalItemStatusDonut data={data.globalItemStatus} />
        <VolumeByProjectBar    data={data.volumeByProject} />
        <FteByProjectBar       data={data.fteByProject} />
        <SprintHealthBar       data={data.sprintHealth} />
      </div>
    </div>
  );
};

export default AdminDashboard;
