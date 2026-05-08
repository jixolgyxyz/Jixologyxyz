import { type FC, useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/core/auth/userContext';
import { useUserDashboardData } from '../hooks/useUserDashboardData';
import type { ProjectRecord } from '../services/dashboard.service';
import StatusDonut from '../components/StatusDonut';
import HoursBySprintBar from '../components/HoursBySprintBar';
import ItemsByTypeBar from '../components/ItemsByTypeBar';
import PriorityBar from '../components/PriorityBar';
import ComplexityScatter from '../components/ComplexityScatter';
import OverdueCard from '../components/OverdueCard';
import UpcomingCard from '../components/UpcomingCard';
import JornadaFteCard from '../components/JornadaFteCard';
import styles from './UserDashboard.module.css';

// ── Multi-select project dropdown ──────────────────────────────────────
interface ProjectDropdownProps {
  projects:          ProjectRecord[];
  selectedIds:       number[] | null;   // null = all
  onChange:          (ids: number[] | null) => void;
}

const ProjectDropdown: FC<ProjectDropdownProps> = ({ projects, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isAll = selectedIds === null || selectedIds.length === 0;

  const label = isAll
    ? 'Todos los proyectos'
    : selectedIds!.length === 1
      ? projects.find(p => p.id === selectedIds![0])?.nombre ?? 'Proyecto'
      : `${selectedIds!.length} proyectos`;

  const toggleProject = (id: number) => {
    if (selectedIds === null) {
      // was "all" → select only this one
      onChange([id]);
    } else if (selectedIds.includes(id)) {
      const next = selectedIds.filter(x => x !== id);
      onChange(next.length === 0 ? null : next);
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => { onChange(null); setOpen(false); };

  return (
    <div ref={ref} className={styles.projectDropdownWrap}>
      <button
        type="button"
        className={`${styles.projectDropdownBtn} ${!isAll ? styles.projectDropdownBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.projectDropdownLabel}>{label}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`${styles.projectDropdownChevron} ${open ? styles.projectDropdownChevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.projectDropdownMenu}>
          {/* "Todos los proyectos" option */}
          <button
            type="button"
            className={`${styles.projectDropdownOption} ${isAll ? styles.projectDropdownOptionActive : ''}`}
            onClick={selectAll}
          >
            <span className={styles.projectDropdownOptionCheck}>
              {isAll && <CheckIcon width={12} height={12} />}
            </span>
            <span>Todos los proyectos</span>
          </button>

          <div className={styles.projectDropdownDivider} />

          {projects.map(p => {
            const selected = selectedIds?.includes(p.id) ?? false;
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.projectDropdownOption} ${selected ? styles.projectDropdownOptionActive : ''}`}
                onClick={() => toggleProject(p.id)}
              >
                <span className={styles.projectDropdownOptionCheck}>
                  {selected && <CheckIcon width={12} height={12} />}
                </span>
                <span>{p.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────
const UserDashboard: FC = () => {
  const { user } = useUser();
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[] | null>(null);
  const { data, projects, loading, error } = useUserDashboardData(selectedProjectIds);

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
          {projects.length > 0 && (
            <ProjectDropdown
              projects={projects}
              selectedIds={selectedProjectIds}
              onChange={setSelectedProjectIds}
            />
          )}
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
        <OverdueCard       items={data.overdueItems}  />
        <UpcomingCard      items={data.upcomingItems} />
        <JornadaFteCard data={data.jornadaFte} />
        <StatusDonut       data={data.statusData}    />
        <HoursBySprintBar  data={data.sprintHours}   />
        <ItemsByTypeBar    data={data.typeData}       />
        <PriorityBar       data={data.priorityData}  />
        <ComplexityScatter data={data.complexityData} />
      </div>
    </div>
  );
};

export default UserDashboard;
