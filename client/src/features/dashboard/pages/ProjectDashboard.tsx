import { type FC, useState } from 'react';
import { useAdminDashboardData } from '../hooks/useAdminDashboardData';
import { useVisibleGraphs } from '../hooks/useVisibleGraphs';
import CustomizePanel from '../components/CustomizePanel/CustomizePanel';
import { renderAdminGraph } from './AdminDashboard';
import styles from './UserDashboard.module.css';

const ProjectDashboard: FC = () => {
  const { data, loading, error } = useAdminDashboardData();
  const { visible, available, pmProjectIds, toggle, isVisible, loading: graphsLoading } =
    useVisibleGraphs('project');
  const [showCustomizePanel, setShowCustomizePanel]   = useState(false);
  const [selectedProjectIds, setSelectedProjectIds]   = useState<number[] | null>(null);

  if (loading || graphsLoading) {
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

  if (pmProjectIds.size === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>No tienes rol de PM en ningún proyecto.</div>
      </div>
    );
  }

  if (!data) return null;

  // Convert number[] | null → Set<number>, always scoped to PM projects
  const activeFilter: Set<number> =
    selectedProjectIds && selectedProjectIds.length > 0
      ? new Set(selectedProjectIds.filter(id => pmProjectIds.has(id)))
      : pmProjectIds;

  const pmProjects = data.completionByProject
    .filter(r => pmProjectIds.has(r.id))
    .map(r => ({ id: r.id, nombre: r.name }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.greeting}>Dashboard de Proyectos</p>
            <p className={styles.subtitle}>Salud de los proyectos donde eres PM</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.customizeBtn}
              onClick={() => setShowCustomizePanel(true)}
              aria-label="Personalizar dashboard"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 7h12M4 13h12M8 4v6M12 10v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Personalizar
            </button>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {visible.map(g => (
          <div key={g.id}>{renderAdminGraph(g, data, activeFilter)}</div>
        ))}
      </div>

      <CustomizePanel
        open={showCustomizePanel}
        onClose={() => setShowCustomizePanel(false)}
        available={available}
        isVisible={isVisible}
        toggle={toggle}
        showBadge={false}
        projects={pmProjects.length > 1 ? pmProjects : undefined}
        selectedProjectIds={selectedProjectIds}
        onProjectChange={setSelectedProjectIds}
      />
    </div>
  );
};

export default ProjectDashboard;
