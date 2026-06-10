import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { useUser } from '@/core/auth/userContext';
import { usePmProjects } from '@/features/dashboard/hooks/usePmProjects';
import NotificationBell from '@/features/notifications/components/NotificationBell';

import {
  UserCircleIcon,
  BeakerIcon,
  BookOpenIcon,
  UserPlusIcon,
  MinusCircleIcon,
  PresentationChartBarIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/solid';
import { signOutService } from '@/features/auth/services/auth.service';

export interface ISidebarProps {
  children?: ReactNode;
}

const Sidebar: React.FC<ISidebarProps> = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { projectIds: pmProjectIds } = usePmProjects();
  const [dashOpen, setDashOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.idRolGlobal === 1 || user.idRolGlobal === 2;
  const hasPmProjects = pmProjectIds.size > 0;

  const handleLogout = async () => {
    try {
      await signOutService();
      navigate('/inicio-sesion', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <>
      <aside className={styles.sidebar}>
        <ul className={styles.menu}>
          <div>
            {/* ── Dashboard group (collapsible) ─────────────────────── */}
            <li className={styles.menuItem}>
              <button
                type="button"
                className={styles.dashToggle}
                onClick={() => setDashOpen(o => !o)}
              >
                <BeakerIcon className={styles.icon} />
                <span className={styles.dashToggleLabel}>
                  <b>Dashboard</b>
                  <ChevronDownIcon
                    className={`${styles.dashChevron} ${dashOpen ? styles.dashChevronOpen : ''}`}
                  />
                </span>
              </button>

              <ul className={`${styles.dashChildren} ${dashOpen ? styles.dashChildrenOpen : ''}`}>
                <li>
                  <NavLink
                    to="/dashboard-usuario"
                    className={({ isActive }) =>
                      `${styles.dashChild} ${isActive ? styles.dashChildActive : ''}`
                    }
                  >
                    <BeakerIcon className={styles.dashChildIcon} />
                    <span className={styles.dashChildText}><b>Dashboard</b> Usuario</span>
                  </NavLink>
                </li>

                {hasPmProjects && (
                  <li>
                    <NavLink
                      to="/dashboard-proyectos"
                      className={({ isActive }) =>
                        `${styles.dashChild} ${isActive ? styles.dashChildActive : ''}`
                      }
                    >
                      <PresentationChartBarIcon className={styles.dashChildIcon} />
                      <span className={styles.dashChildText}><b>Dashboard</b> Proyectos</span>
                    </NavLink>
                  </li>
                )}

                {isAdmin && (
                  <li>
                    <NavLink
                      to="/dashboard-admin"
                      className={({ isActive }) =>
                        `${styles.dashChild} ${isActive ? styles.dashChildActive : ''}`
                      }
                    >
                      <PresentationChartBarIcon className={styles.dashChildIcon} />
                      <span className={styles.dashChildText}><b>Dashboard</b> Admin</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </li>

            <li className={styles.menuItem}>
              <NavLink to="/proyectos">
                <BookOpenIcon className={styles.icon} />
                <span><b>Proyectos</b></span>
              </NavLink>
            </li>

            <li className={styles.menuItem}>
              <NavLink to="/calendario">
                <CalendarDaysIcon className={styles.icon} />
                <span><b>Calendario</b></span>
              </NavLink>
            </li>

            {isAdmin && (
              <li className={styles.menuItem}>
                <NavLink to="/usuarios">
                  <UserPlusIcon className={styles.icon} />
                  <span><b>Crear Usuario</b></span>
                </NavLink>
              </li>
            )}

            <li className={styles.deadSpace}></li>

            <li className={styles.menuItem}>
              <NotificationBell variant="sidebar" />
            </li>

            <li className={styles.menuItem}>
              <NavLink to="/perfil">
                <UserCircleIcon className={styles.icon} />
                <span><b>Perfil</b></span>
              </NavLink>
            </li>
          </div>

          <div>
            <li className={styles.menuItem}>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logOut}
              >
                <MinusCircleIcon className={styles.icon} />
                <span><b>Cerrar Sesión</b></span>
              </button>
            </li>
          </div>
        </ul>
      </aside>

      <div className={styles.overlay}></div>
    </>
  );
};

export default Sidebar;
