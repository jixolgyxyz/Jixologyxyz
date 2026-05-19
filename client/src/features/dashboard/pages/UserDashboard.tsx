import { type FC, useState } from 'react';
import { useUser } from '@/core/auth/userContext';
import { useUserDashboardData } from '../hooks/useUserDashboardData';
import { useVisibleGraphs } from '../hooks/useVisibleGraphs';
import type { GraphDescriptor } from '../config/graphCatalog';
import StatusDonut from '../components/StatusDonut';
import HoursBySprintBar from '../components/HoursBySprintBar';
import ItemsByTypeBar from '../components/ItemsByTypeBar';
import PriorityBar from '../components/PriorityBar';
import ComplexityScatter from '../components/ComplexityScatter';
import ComplexityTimeScatter from '../components/ComplexityTimeScatter';
import TimeAccuracyChart from '../components/TimeAccuracyChart';
import OverdueCard from '../components/OverdueCard';
import UpcomingCard from '../components/UpcomingCard';
import JornadaFteCard from '../components/JornadaFteCard';
import CustomizePanel from '../components/CustomizePanel/CustomizePanel';
import styles from './UserDashboard.module.css';

// ── User-graph renderer (personal/user-only graphs) ───────────────────
type UserDashData = NonNullable<ReturnType<typeof useUserDashboardData>['data']>;
function renderUserGraph(g: GraphDescriptor, d: UserDashData) {
  switch (g.id) {
    case 'personal_overdue':       return <OverdueCard       items={d.overdueItems} />;
    case 'personal_upcoming':      return <UpcomingCard      items={d.upcomingItems} />;
    case 'jornada_fte':            return <JornadaFteCard    data={d.jornadaFte} />;
    case 'personal_status':        return <StatusDonut       data={d.statusData} />;
    case 'hours_by_sprint':        return <HoursBySprintBar  data={d.sprintHours} />;
    case 'items_by_type':          return <ItemsByTypeBar    data={d.typeData} />;
    case 'priority_distribution':  return <PriorityBar       data={d.priorityData} />;
    case 'complexity_hours':        return <ComplexityScatter     data={d.complexityData} />;
    case 'complexity_time_scatter':      return <ComplexityTimeScatter data={d.complexityTimeData} />;
    case 'time_accuracy_by_complexity':  return <TimeAccuracyChart    data={d.timeAccuracyData} />;
    default: return null;
  }
}

// ── Page ───────────────────────────────────────────────────────────────
const UserDashboard: FC = () => {
  const { user } = useUser();
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[] | null>(null);
  const { data, projects, loading, error } = useUserDashboardData(selectedProjectIds);
  const { visible, available, toggle, isVisible } = useVisibleGraphs('user');
  const [showCustomizePanel, setShowCustomizePanel] = useState(
    () => sessionStorage.getItem('customizePanelOpen_user') === 'true',
  );

  const firstName = user?.nombre ?? 'Usuario';

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
            <p className={styles.greeting}>Hola, {firstName}</p>
            <p className={styles.subtitle}>Resumen de tus ítems asignados</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.customizeBtn}
              onClick={() => { setShowCustomizePanel(true); sessionStorage.setItem('customizePanelOpen_user', 'true'); }}
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

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.totalItems}</div>
          <div className={styles.statLabel}>Total asignados</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.overdueItems.length}</div>
          <div className={styles.statLabel}>Vencidos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.itemsWithEstimate}</div>
          <div className={styles.statLabel}>Con estimación</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {data.sprintHours.total}h
          </div>
          <div className={styles.statLabel}>Horas totales</div>
        </div>
      </div>

      <div className={styles.grid}>
        {visible.map(g => (
          <div key={g.id}>{renderUserGraph(g, data)}</div>
        ))}
      </div>

      <CustomizePanel
        open={showCustomizePanel}
        onClose={() => { setShowCustomizePanel(false); sessionStorage.removeItem('customizePanelOpen_user'); }}
        available={available}
        isVisible={isVisible}
        toggle={toggle}
        projects={projects.length > 0 ? projects : undefined}
        selectedProjectIds={selectedProjectIds}
        onProjectChange={setSelectedProjectIds}
      />
    </div>
  );
};

export default UserDashboard;
