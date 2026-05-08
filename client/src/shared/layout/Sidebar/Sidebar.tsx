import React from 'react';
import type { ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { useUser } from '@/core/auth/userContext';
import NotificationBell from '@/features/notifications/components/NotificationBell';

import {
  UserCircleIcon,
  BeakerIcon,
  BookOpenIcon,
  UserPlusIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/solid';
import { signOutService } from '@/features/auth/services/auth.service';

//const ADMIN_VIEWS = [1,2];

export interface ISidebarProps {
  children?: ReactNode;
}

const Sidebar: React.FC<ISidebarProps> = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  if (!user) return null;

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
            <li className={styles.menuItem}>
              <NavLink to="/dashboard-usuario">
                <BeakerIcon className={styles.icon} />
                <span><b>Dashboard</b></span>
              </NavLink>
            </li>

            <li className={styles.menuItem}>
              <NavLink to="/proyectos">
                <BookOpenIcon className={styles.icon} />
                <span><b>Proyectos</b></span>
              </NavLink>
            </li>

            <li className={styles.menuItem}>
              <NavLink to="/perfil">
                <UserCircleIcon className={styles.icon} />
                <span><b>Perfil</b></span>
              </NavLink>
            </li>

            <li className={styles.menuItem}>
              <NotificationBell variant="sidebar" />
            </li>

            {user.idRolGlobal === 1 && (
              <li className={styles.menuItem}>
                <NavLink to="/usuarios">
                  <UserPlusIcon className={styles.icon} />
                  <span><b>Crear Usuario</b></span>
                </NavLink>
              </li>
            )}
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