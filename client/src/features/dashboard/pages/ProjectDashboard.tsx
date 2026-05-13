import { type FC, useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAdminDashboardData } from '../hooks/useAdminDashboardData';
import { useVisibleGraphs } from '../hooks/useVisibleGraphs';
import CustomizePanel from '../components/CustomizePanel/CustomizePanel';
import { renderAdminGraph } from './AdminDashboard';
import styles from './UserDashboard.module.css';

// ── Project filter dropdown (shows only PM projects) ──────────────────
interface ProjectOption { id: number; nombre: string; }

interface ProjectDropdownProps {
  projects:    ProjectOption[];
  selectedIds: Set<number> | null;   // null = all PM projects
  onChange:    (ids: Set<number> | null) => void;
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

  const isAll = selectedIds === null || selectedIds.size === 0;

  const label = isAll
    ? 'Todos mis proyectos'
    : selectedIds!.size === 1
      ? projects.find(p => selectedIds!.has(p.id))?.nombre ?? 'Proyecto'
      : `${selectedIds!.size} proyectos`;

  const toggle = (id: number) => {
    if (selectedIds === null) {
      onChange(new Set([id]));
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      onChange(next.size === 0 ? null : next);
    }
  };

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
          <button
            type="button"
            className={`${styles.projectDropdownOption} ${isAll ? styles.projectDropdownOptionActive : ''}`}
            onClick={() => { onChange(null); setOpen(false); }}
          >
            <span className={styles.projectDropdownOptionCheck}>
              {isAll && <CheckIcon width={12} height={12} />}
            </span>
            <span>Todos mis proyectos</span>
          </button>

          <div className={styles.projectDropdownDivider} />

          {projects.map(p => {
            const selected = selectedIds?.has(p.id) ?? false;
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.projectDropdownOption} ${selected ? styles.projectDropdownOptionActive : ''}`}
                onClick={() => toggle(p.id)}
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
const ProjectDashboard: FC = () => {
  const { data, loading, error } = useAdminDashboardData();
  const { visible, available, pmProjectIds, toggle, isVisible, loading: graphsLoading } =
    useVisibleGraphs('project');
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  // null = show all PM projects; non-null = filter to this subset
  const [selectedFilter, setSelectedFilter] = useState<Set<number> | null>(null);

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
        <div className={styles.center}>
          No tienes rol de PM en ningún proyecto.
        </div>
      </div>
    );
  }

  if (!data) return null;

  // The active filter: if user has picked specific projects use those,
  // otherwise default to all PM projects.
  const activeFilter = selectedFilter ?? pmProjectIds;

  // Build the list of PM projects for the dropdown
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
            {pmProjects.length > 1 && (
              <ProjectDropdown
                projects={pmProjects}
                selectedIds={selectedFilter}
                onChange={setSelectedFilter}
              />
            )}
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
      />
    </div>
  );
};

export default ProjectDashboard;
