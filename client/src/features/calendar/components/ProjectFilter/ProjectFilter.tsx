import React from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';
import styles from './ProjectFilter.module.css';
import type { CalendarProjectRecord } from '../../types/calendar.types';

interface ProjectFilterProps {
  projects: CalendarProjectRecord[];
  visibleProjectIds: Set<number>;
  onToggle: (projectId: number) => void;
  onToggleAll: (visible: boolean) => void;
  projectColors: Map<number, string>;
}

const ProjectFilter: React.FC<ProjectFilterProps> = ({
  projects,
  visibleProjectIds,
  onToggle,
  onToggleAll,
  projectColors,
}) => {
  const allVisible = projects.length > 0 && projects.every(p => visibleProjectIds.has(p.id));

  if (projects.length === 0) return null;

  return (
    <aside className={styles.filter}>
      <div className={styles.header}>
        <span className={styles.title}>Mis Proyectos</span>
        <button
          type="button"
          className={styles.chevronBtn}
          title={allVisible ? 'Ocultar todos' : 'Mostrar todos'}
          onClick={() => onToggleAll(!allVisible)}
        >
          <ChevronUpIcon className={`${styles.chevron} ${allVisible ? '' : styles.chevronDown}`} />
        </button>
      </div>

      <ul className={styles.list}>
        {projects.map(project => {
          const visible = visibleProjectIds.has(project.id);
          const color = projectColors.get(project.id) ?? '#9e9e9e';

          return (
            <li key={project.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => onToggle(project.id)}
              >
                <span
                  className={styles.checkbox}
                  style={visible ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
                >
                  {visible && (
                    <svg viewBox="0 0 12 10" className={styles.checkmark}>
                      <polyline points="1,5 4.5,9 11,1" />
                    </svg>
                  )}
                </span>
                <span className={`${styles.name} ${!visible ? styles.nameHidden : ''}`}>
                  {project.nombre}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default ProjectFilter;
