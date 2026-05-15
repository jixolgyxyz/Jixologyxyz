import { useState, useEffect, useRef, type FC } from 'react';
import { XMarkIcon, DocumentTextIcon, LockClosedIcon, GlobeAltIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { fetchReports, downloadReport, type ReporteRow } from '../../services/reporte.service';
import { useUser } from '@/core/auth/userContext';
import type { AdminDashboardData } from '../../hooks/useAdminDashboardData';
import type { ReportConfig } from '../../hooks/useWeeklyReport';
import SearchBarComponent from '@/shared/components/SearchBarComponent/SearchBarComponent';
import styles from './GenerateReportModal.module.css';

interface BubbleOption { label: string; value: string | null; }

function FilterBubble({ label, options, value, onChange }: {
  label: string;
  options: BubbleOption[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value !== null ? options.find(o => o.value === value) : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.bubble}>
      <button
        type="button"
        className={`${styles.bubbleBtn} ${value !== null ? styles.bubbleBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected ? selected.label : label}</span>
        <ChevronDownIcon width={11} height={11} />
      </button>
      {open && (
        <div className={styles.bubbleMenu} onClick={() => setOpen(false)}>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              className={`${styles.bubbleMenuItem} ${value === opt.value ? styles.bubbleMenuItemActive : ''}`}
              onClick={() => onChange(value === opt.value ? null : opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FechaBubble({ dateFrom, dateTo, onFromChange, onToChange }: {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = !!dateFrom || !!dateTo;
  const fmtShort = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const day = d.getDate();
    const mon = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
    const yr  = String(d.getFullYear()).slice(2);
    return `${day} ${mon} ${yr}`;
  };
  const btnLabel = isActive
    ? [dateFrom && fmtShort(dateFrom), dateTo && fmtShort(dateTo)].filter(Boolean).join('–')
    : 'Fecha';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.bubble}>
      <button
        type="button"
        className={`${styles.bubbleBtn} ${isActive ? styles.bubbleBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{btnLabel}</span>
        <ChevronDownIcon width={11} height={11} />
      </button>
      {open && (
        <div className={styles.bubbleMenu} style={{ minWidth: '200px', padding: '0.75rem', right: 0, left: 'auto' }}>
          <span className={styles.bubbleDateLabel}>Desde</span>
          <input
            type="date"
            className={styles.bubbleDateInput}
            value={dateFrom}
            onChange={e => onFromChange(e.target.value)}
          />
          <span className={styles.bubbleDateLabel} style={{ marginTop: '0.5rem' }}>Hasta</span>
          <input
            type="date"
            className={styles.bubbleDateInput}
            value={dateTo}
            min={dateFrom}
            onChange={e => onToChange(e.target.value)}
          />
          {isActive && (
            <button
              type="button"
              className={styles.bubbleClearBtn}
              onClick={() => { onFromChange(''); onToChange(''); }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const METRIC_GROUPS = [
  {
    group: 'Progreso',
    items: [
      { key: 'completion',        label: 'Completación' },
      { key: 'volume',            label: 'Volumen backlog' },
      { key: 'weekly_progress',   label: 'Progreso semanal' },
    ],
  },
  {
    group: 'Sprints',
    items: [
      { key: 'sprint_health',     label: 'Salud de sprints' },
      { key: 'sprint_completion', label: 'Cierre de sprints' },
    ],
  },
  {
    group: 'Riesgo',
    items: [
      { key: 'overdue_items',     label: 'Ítems vencidos' },
      { key: 'overdue_rate',      label: 'Tasa de vencimiento' },
      { key: 'backlog_pressure',  label: 'Presión de backlog' },
      { key: 'overdue_hours',     label: 'Horas en deuda' },
      { key: 'delivery_risk',     label: 'Riesgo de entrega' },
    ],
  },
  {
    group: 'Esfuerzo',
    items: [
      { key: 'hours_done_pending', label: 'Hrs. hechas/pend.' },
      { key: 'fte',               label: 'FTE por proyecto' },
      { key: 'priority_hours',    label: 'Horas por prioridad' },
    ],
  },
  {
    group: 'Calidad',
    items: [
      { key: 'bug_ratio',         label: 'Ratio de bugs' },
      { key: 'global_status',     label: 'Estado global' },
    ],
  },
];

const ALL_METRIC_KEYS = METRIC_GROUPS.flatMap(g => g.items.map(i => i.key));

interface Props {
  data: AdminDashboardData;
  state: 'idle' | 'loading' | 'error';
  errorMsg: string | null;
  onGenerate: (config: ReportConfig) => void;
  onClose: () => void;
}

const GenerateReportModal: FC<Props> = ({ data, state, errorMsg, onGenerate, onClose }) => {
  const { user } = useUser();
  const projectNames = data.completionByProject.map(p => p.name);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set(projectNames));

  const today = new Date();
  const day   = today.getDay();
  const diff  = day === 0 ? -6 : 1 - day;
  const mon   = new Date(today); mon.setDate(today.getDate() + diff);
  const sun   = new Date(mon);   sun.setDate(mon.getDate() + 6);
  const toVal = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(toVal(mon));
  const [endDate,   setEndDate]   = useState(toVal(sun));

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(ALL_METRIC_KEYS));
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(METRIC_GROUPS.map(g => g.group)));
  const [projectsCollapsed, setProjectsCollapsed] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');

  const sanitize = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/g, '');
  const suggestName = (projects: Set<string>) => {
    const names = Array.from(projects);
    if (names.length === 0) return 'Reporte_Personalizado';
    const slug = names.slice(0, 2).map(sanitize).join('_');
    return `Reporte_${slug}`;
  };

  const [reportName, setReportName]   = useState(() => suggestName(new Set(projectNames)));
  const [nameTouched, setNameTouched] = useState(false);
  const [visibilidad, setVisibilidad] = useState<'publico' | 'privado'>('privado');

  const toggleMetric = (key: string) =>
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });

  const toggleGroupCollapse = (group: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) { next.delete(group); } else { next.add(group); }
      return next;
    });

  const [reports, setReports]           = useState<ReporteRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportSearch,    setReportSearch]    = useState('');
  const [reportTypeVis,   setReportTypeVis]   = useState<string | null>(
    () => sessionStorage.getItem('reportFilter_type') ?? null,
  );
  const [reportVisFilter, setReportVisFilter] = useState<string | null>(
    () => sessionStorage.getItem('reportFilter_vis') ?? null,
  );
  const [filterDateFrom,  setFilterDateFrom]  = useState(
    () => sessionStorage.getItem('reportFilter_dateFrom') ?? '',
  );
  const [filterDateTo,    setFilterDateTo]    = useState(
    () => sessionStorage.getItem('reportFilter_dateTo') ?? '',
  );

  const setTypeVis = (v: string | null) => {
    setReportTypeVis(v);
    if (v) sessionStorage.setItem('reportFilter_type', v);
    else sessionStorage.removeItem('reportFilter_type');
  };
  const setVisFilter = (v: string | null) => {
    setReportVisFilter(v);
    if (v) sessionStorage.setItem('reportFilter_vis', v);
    else sessionStorage.removeItem('reportFilter_vis');
  };
  const setDateFrom = (v: string) => {
    setFilterDateFrom(v);
    if (v) sessionStorage.setItem('reportFilter_dateFrom', v);
    else sessionStorage.removeItem('reportFilter_dateFrom');
  };
  const setDateTo = (v: string) => {
    setFilterDateTo(v);
    if (v) sessionStorage.setItem('reportFilter_dateTo', v);
    else sessionStorage.removeItem('reportFilter_dateTo');
  };

  const userId = user?.id;
  useEffect(() => {
    fetchReports(userId ?? 0)
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [state, userId]);

  const loading = state === 'loading';

  const toggleProject = (name: string) =>
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      if (!nameTouched) setReportName(suggestName(next));
      return next;
    });

  const toggleAll = () => {
    const next = selectedProjects.size === projectNames.length ? new Set<string>() : new Set(projectNames);
    if (!nameTouched) setReportName(suggestName(next));
    setSelectedProjects(next);
  };

  const canCustom =
    selectedProjects.size > 0 && !!startDate && !!endDate && startDate <= endDate;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const filteredReports = reports.filter(r => {
    const name = r.nombre ? r.nombre.replace(/_/g, ' ') : `Reporte Semanal ${r.semana_inicio}`;
    if (reportSearch && !name.toLowerCase().includes(reportSearch.toLowerCase())) return false;
    if (reportTypeVis   === 'semanal'       && r.nombre !== null)            return false;
    if (reportTypeVis   === 'personalizado' && r.nombre === null)            return false;
    if (reportVisFilter === 'publico'       && r.visibilidad !== 'publico')  return false;
    if (reportVisFilter === 'privado'       && r.visibilidad !== 'privado')  return false;
    if (filterDateFrom && r.semana_inicio < filterDateFrom) return false;
    if (filterDateTo   && r.semana_inicio > filterDateTo)   return false;
    return true;
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.codeBadge}>Reportes</span>
          </div>
          <div className={styles.topBarActions}>
            {state === 'error' && errorMsg && (
              <span className={styles.inlineError}>Error al generar</span>
            )}
            <button className={styles.closePanelBtn} onClick={onClose} aria-label="Cerrar">
              <XMarkIcon style={{ width: '1.25rem', height: '1.25rem', display: 'block', flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className={styles.body}>

          {/* ── Main: report history ── */}
          <div className={styles.main}>
            <span className={styles.sectionTitle}>Historial de reportes</span>

            <SearchBarComponent
              infoText="Buscar reporte…"
              onChange={setReportSearch}
              fontSize="0.8rem"
            />
            <div className={styles.bubbleRow}>
              <FilterBubble
                label="Tipo"
                value={reportTypeVis}
                onChange={setTypeVis}
                options={[
                  { label: 'Semanal',       value: 'semanal' },
                  { label: 'Personalizado', value: 'personalizado' },
                ]}
              />
              <FilterBubble
                label="Visibilidad"
                value={reportVisFilter}
                onChange={setVisFilter}
                options={[
                  { label: 'Público', value: 'publico' },
                  { label: 'Privado', value: 'privado' },
                ]}
              />
              <FechaBubble
                dateFrom={filterDateFrom}
                dateTo={filterDateTo}
                onFromChange={setDateFrom}
                onToChange={setDateTo}
              />
            </div>

            {reportsLoading ? (
              <span className={styles.empty}>Cargando…</span>
            ) : filteredReports.length === 0 ? (
              <span className={styles.empty}>{reports.length === 0 ? 'Sin reportes generados.' : 'Sin resultados.'}</span>
            ) : (
              <div className={styles.reportList}>
                {filteredReports.map(r => (
                  <button
                    key={r.id}
                    className={styles.reportCard}
                    onClick={() => downloadReport(r)}
                    title="Descargar reporte"
                  >
                    <DocumentTextIcon className={styles.reportIcon} />
                    <div className={styles.reportInfo}>
                      <span className={styles.reportWeek} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {r.visibilidad === 'privado'
                          ? <LockClosedIcon style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0, color: 'var(--color-anchor-gray-1)' }} />
                          : <GlobeAltIcon  style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0, color: 'var(--color-anchor-gray-1)' }} />}
                        {r.nombre ? r.nombre.replace(/_/g, ' ') : `Reporte Semanal · ${fmtDate(r.semana_inicio)}`}
                      </span>
                      <span className={styles.reportCreator}>
                        Creado por: {r.creador ?? 'Usuario desconocido'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar: generation options ── */}
          <div className={styles.sidebar}>

            {/* Standard report */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Reporte semanal</span>
              <p className={styles.detailHint}>
                Semana actual · todos los proyectos
              </p>
              <button
                className={styles.generateBtn}
                onClick={() => onGenerate({ type: 'standard' })}
                disabled={loading}
              >
                {loading ? <><span className={styles.spinner} />Generando…</> : 'Generar'}
              </button>
            </div>

            {/* Custom report */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Reporte personalizado</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fechas</span>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
              />
              {startDate > endDate && (
                <span className={styles.validationMsg}>La fecha de fin debe ser posterior.</span>
              )}
            </div>

            <div className={styles.detailRow}>
              <button
                onClick={() => setProjectsCollapsed(c => !c)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <span className={styles.detailLabel}>Proyectos</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-anchor-gray-1)', lineHeight: 1 }}>
                  {projectsCollapsed ? '▸' : '▾'}
                </span>
              </button>
              {!projectsCollapsed && (
                <>
                  <div className={styles.detailLabelRow} style={{ marginTop: '0.25rem' }}>
                    <div style={{ flex: 1, minWidth: 0, transform: 'scale(0.78)', transformOrigin: 'left center' }}>
                      <SearchBarComponent
                        infoText="Buscar…"
                        onChange={setProjectSearch}
                        fontSize="0.75rem"
                      />
                    </div>
                    <button className={styles.selectAllBtn} onClick={toggleAll}>
                      {selectedProjects.size === projectNames.length ? 'Ninguno' : 'Todos'}
                    </button>
                  </div>
                  <div className={styles.checkList}>
                    {projectNames
                      .filter(name => name.toLowerCase().includes(projectSearch.toLowerCase()))
                      .map(name => (
                        <label key={name} className={styles.checkRow}>
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(name)}
                            onChange={() => toggleProject(name)}
                            className={styles.checkbox}
                          />
                          <span className={styles.checkName}>{name}</span>
                        </label>
                      ))}
                  </div>
                  {selectedProjects.size === 0 && (
                    <span className={styles.validationMsg}>Selecciona al menos un proyecto.</span>
                  )}
                </>
              )}
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailLabelRow}>
                <span className={styles.detailLabel}>Métricas</span>
                <button
                  className={styles.selectAllBtn}
                  onClick={() => setSelectedMetrics(
                    selectedMetrics.size === ALL_METRIC_KEYS.length ? new Set() : new Set(ALL_METRIC_KEYS),
                  )}
                >
                  {selectedMetrics.size === ALL_METRIC_KEYS.length ? 'Ninguna' : 'Todas'}
                </button>
              </div>
              {METRIC_GROUPS.map(g => {
                const collapsed = collapsedGroups.has(g.group);
                return (
                  <div key={g.group} style={{ marginTop: '0.5rem' }}>
                    <button
                      onClick={() => toggleGroupCollapse(g.group)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0.2rem 0', marginBottom: collapsed ? 0 : '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-anchor-gray-1)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Poppins, sans-serif' }}>
                        {g.group}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-anchor-gray-1)', lineHeight: 1 }}>
                        {collapsed ? '▸' : '▾'}
                      </span>
                    </button>
                    {!collapsed && (
                      <div className={styles.projectList}>
                        {g.items.map(({ key, label }) => (
                          <label
                            key={key}
                            className={`${styles.projectOption} ${selectedMetrics.has(key) ? styles.projectOptionSelected : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMetrics.has(key)}
                              onChange={() => toggleMetric(key)}
                              className={styles.hiddenCheckbox}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedMetrics.size === 0 && (
                <span className={styles.validationMsg}>Selecciona al menos una métrica.</span>
              )}
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Visibilidad</span>
              <div style={{ display: 'flex', gap: 6, paddingTop: '0.25rem' }}>
                {(['privado', 'publico'] as const).map(opt => (
                  <label
                    key={opt}
                    className={`${styles.projectOption} ${visibilidad === opt ? styles.projectOptionSelected : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <input type="radio" name="acceso" value={opt} checked={visibilidad === opt} onChange={() => setVisibilidad(opt)} className={styles.hiddenCheckbox} />
                    {opt === 'privado'
                      ? <><LockClosedIcon style={{ width: '0.75rem', height: '0.75rem' }} /> Privado</>
                      : <><GlobeAltIcon  style={{ width: '0.75rem', height: '0.75rem' }} /> Público</>}
                  </label>
                ))}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-anchor-gray-1)', fontFamily: 'Poppins, sans-serif' }}>
                {visibilidad === 'privado' ? 'Solo tú puedes verlo.' : 'Visible para todos los usuarios.'}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Nombre del reporte</span>
              <input
                type="text"
                className={styles.dateInput}
                value={reportName}
                onChange={e => { setReportName(e.target.value); setNameTouched(true); }}
                placeholder="Nombre del archivo PDF"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-anchor-gray-1)', fontFamily: 'Poppins, sans-serif' }}>
                Se guardará como <em>{reportName || 'Reporte'}_{startDate}.pdf</em>
              </span>
            </div>

            <div className={styles.detailRow} style={{ border: 'none' }}>
              <button
                className={styles.generateBtn}
                onClick={() => onGenerate({
                  type:         'custom',
                  projectNames: Array.from(selectedProjects),
                  startDate:    new Date(startDate + 'T00:00:00'),
                  endDate:      new Date(endDate   + 'T23:59:59'),
                  metrics:      Array.from(selectedMetrics),
                  nombre:       reportName.trim() || undefined,
                  visibilidad,
                })}
                disabled={loading || !canCustom || selectedMetrics.size === 0}
              >
                {loading ? <><span className={styles.spinner} />Generando…</> : 'Generar personalizado'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateReportModal;
