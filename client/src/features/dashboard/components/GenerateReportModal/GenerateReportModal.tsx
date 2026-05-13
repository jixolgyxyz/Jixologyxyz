import { useState, useEffect, type FC } from 'react';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { fetchReports, downloadReport, type ReporteRow } from '../../services/reporte.service';
import type { AdminDashboardData } from '../../hooks/useAdminDashboardData';
import type { ReportConfig } from '../../hooks/useWeeklyReport';
import styles from './GenerateReportModal.module.css';

interface Props {
  data: AdminDashboardData;
  state: 'idle' | 'loading' | 'error';
  errorMsg: string | null;
  onGenerate: (config: ReportConfig) => void;
  onClose: () => void;
}

const GenerateReportModal: FC<Props> = ({ data, state, errorMsg, onGenerate, onClose }) => {
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

  const [reports, setReports]           = useState<ReporteRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    fetchReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [state]); // re-fetch after a report is generated

  const loading = state === 'loading';

  const toggleProject = (name: string) =>
    setSelectedProjects(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () =>
    setSelectedProjects(
      selectedProjects.size === projectNames.length ? new Set() : new Set(projectNames),
    );

  const canCustom =
    selectedProjects.size > 0 && !!startDate && !!endDate && startDate <= endDate;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

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

            {reportsLoading ? (
              <span className={styles.empty}>Cargando…</span>
            ) : reports.length === 0 ? (
              <span className={styles.empty}>Sin reportes generados.</span>
            ) : (
              <div className={styles.reportList}>
                {reports.map(r => (
                  <button
                    key={r.id}
                    className={styles.reportCard}
                    onClick={() => downloadReport(r)}
                    title="Descargar reporte"
                  >
                    <DocumentTextIcon className={styles.reportIcon} />
                    <div className={styles.reportInfo}>
                      <span className={styles.reportWeek}>{fmtDate(r.semana_inicio)}</span>
                      <span className={styles.reportDate}>
                        Generado el {fmtDate(r.fecha_creacion)}
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
              <div className={styles.detailLabelRow}>
                <span className={styles.detailLabel}>Proyectos</span>
                <button className={styles.selectAllBtn} onClick={toggleAll}>
                  {selectedProjects.size === projectNames.length ? 'Ninguno' : 'Todos'}
                </button>
              </div>
              <div className={styles.projectList}>
                {projectNames.map(name => (
                  <label
                    key={name}
                    className={`${styles.projectOption} ${selectedProjects.has(name) ? styles.projectOptionSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(name)}
                      onChange={() => toggleProject(name)}
                      className={styles.hiddenCheckbox}
                    />
                    {name}
                  </label>
                ))}
              </div>
              {selectedProjects.size === 0 && (
                <span className={styles.validationMsg}>Selecciona al menos un proyecto.</span>
              )}
            </div>

            <div className={styles.detailRow} style={{ border: 'none' }}>
              <button
                className={styles.generateBtn}
                onClick={() => onGenerate({
                  type: 'custom',
                  projectNames: Array.from(selectedProjects),
                  startDate: new Date(startDate + 'T00:00:00'),
                  endDate:   new Date(endDate   + 'T23:59:59'),
                })}
                disabled={loading || !canCustom}
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
