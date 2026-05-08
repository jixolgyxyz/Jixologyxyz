import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import styles from './ProjectHeader.module.css';
import { useIsProjectAdmin } from '@/features/project/hooks/useIsProjectAdmin';

const Header: React.FC = () => {
  const { id } = useParams();
  const projectId = Number(id);
  const { isProjectAdmin } = useIsProjectAdmin(projectId);

  const NAV_ITEMS = [
    { label: 'Tareas',  to: `/proyectos/${id}/tasks` },
    { label: 'Backlog', to: `/proyectos/${id}/backlog` },
    ...(isProjectAdmin ? [{ label: 'Configuracion', to: `/proyectos/${id}/configuracion` }] : []),
  ];

  return (
    <div className={styles.headerP}>
      <a href="/proyectos">
        <label className={`${styles.element} ${styles.backArrow}`}>←</label>
      </a>

      <div className={styles.navContainer}>
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.element}${isActive ? ` ${styles.elementActive}` : ''}`
            }
          >
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Header;
