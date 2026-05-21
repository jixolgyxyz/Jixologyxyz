import { useState, useCallback, useMemo, type FC } from 'react';
import { useAdminDashboardData } from '../hooks/useAdminDashboardData';
import { useWeeklyReport } from '../hooks/useWeeklyReport';
import { useVisibleGraphs } from '../hooks/useVisibleGraphs';
import { useDashboardPanel } from '../hooks/useDashboardPanel';
import DashboardGrid from '../components/DashboardGrid/DashboardGrid';
import GenerateReportModal from '../components/GenerateReportModal/GenerateReportModal';
import CustomizePanel from '../components/CustomizePanel/CustomizePanel';
import { renderAdminGraph, WeeklyProgressCard } from '../components/AdminGraphs';
import type { GraphDescriptor } from '../config/graphCatalog';
import styles from './AdminDashboard.module.css';

const AdminDashboard: FC = () => {
  const { data, loading, error } = useAdminDashboardData();
  const { state: reportState, errorMsg: reportError, generate } = useWeeklyReport(data);
  const [showReportModal, setShowReportModal] = useState(
    () => sessionStorage.getItem('reportModalOpen') === 'true',
  );
  const { open: showCustomizePanel, openPanel: openCustomizePanel, closePanel: closeCustomizePanel } = useDashboardPanel('admin');
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[] | null>(null);
  const [reorganizeMode, setReorganizeMode] = useState(false);
  const { visible, available, toggle, isVisible, getLayoutItems, saveLayout, error: graphsError } = useVisibleGraphs('admin');

  const projectFilter = useMemo<Set<number> | undefined>(
    () => selectedProjectIds && selectedProjectIds.length > 0 ? new Set(selectedProjectIds) : undefined,
    [selectedProjectIds],
  );

  const renderItemFn = useCallback(
    (g: GraphDescriptor) => data ? renderAdminGraph(g, data, projectFilter) : null,
    [data, projectFilter],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>Cargando dashboard…</div>
      </div>
    );
  }

  if (error || graphsError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>Error al cargar los datos: {error ?? graphsError}</div>
      </div>
    );
  }

  if (!data) return null;

  const allProjects = data.completionByProject.map(r => ({ id: r.id, nombre: r.name }));

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
        reorganizeMode={reorganizeMode}
        renderItem={renderItemFn}
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
        reorganizeMode={reorganizeMode}
        onToggleReorganize={() => { setReorganizeMode(m => !m); closeCustomizePanel(); }}
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
