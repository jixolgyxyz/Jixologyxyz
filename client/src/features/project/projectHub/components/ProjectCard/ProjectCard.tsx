import React, { useState, useRef, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import styles from './ProjectCard.module.css';

import { statusClassMap } from '@/shared/utils/statusClassMap';
import PercentageBar from '@/shared/components/PercentageBar';
import ContextMenu, { type MenuComponent} from '@/shared/components/ContextMenu';

export interface IProjectCardProps {
  projectId: number;
  projectName: string;
  projectStatus: number;
  projectStack: string[];
  completition: number;
  statusLabel: ReactNode;
  projectDueDate: string;      // ISO formato de supabase: "2026-06-15"
  projectDescription: string;
  projectFTE: number;
  forceExpanded?: boolean;
  onClick?: () => void;
  menuItems?: MenuComponent[];
}

const ProjectCard: React.FC<IProjectCardProps> = ({
  projectName,
  projectStatus,
  projectStack,
  completition,
  statusLabel,
  projectDueDate,
  projectDescription,
  projectFTE,
  forceExpanded,
  onClick,
  menuItems,
}) => {
  const [hovered, setHovered] = useState(false);
  const isExpanded = forceExpanded || hovered;
  const [menu, setMenu] = useState<{x: number, y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuRef.current || !menu) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const x = menu.x + width > window.innerWidth  ? menu.x - width : menu.x;
    const y = menu.y + height > window.innerHeight ? menu.y - height : menu.y;
    menuRef.current.style.left       = `${x}px`;
    menuRef.current.style.top        = `${y}px`;
    menuRef.current.style.visibility = 'visible';
  }, [menu]);

  const containerColor = statusClassMap[projectStatus]?.cssClass ?? 'status-unassigned';
  const formattedDate = new Date(projectDueDate).toLocaleDateString();

  return (
    <div
      className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      {(menu && menuItems) && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={(e) => { e.stopPropagation(); setMenu(null); }}
            onContextMenu={(e) => { e.preventDefault(); setMenu(null); }}
          />
          <div ref={menuRef} style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 1000, visibility: 'hidden' }}>
            <ContextMenu elements={menuItems.map(item => ({
              ...item,
              onClick: () => { item.onClick(); setMenu(null); },
              subMenu: item.subMenu?.map(sub => ({
                ...sub,
                onClick: () => { sub.onClick(); setMenu(null); },
              })),
            }))}/>
          </div>
        </>
      )}
      <div className={`${styles.statusBand} ${containerColor}`} />

      {/* Elementos base del projecto simepre visbiles*/}
      <div className={styles.cardElements}>
        <p className={styles.projectName}>{projectName}</p>
        {statusLabel}
      </div>

      {/* Solo visible cuando está expanded */}
      {isExpanded && (
        <>
          <p className={styles.description}>{projectDescription}</p>
          <div className={styles.progressWrapper}>
            <div className={styles.progressInformation}>
            <p className={styles.progreso}>Progreso:</p>
            <p className={styles.progreso} >{completition}%</p>
            </div>
            <PercentageBar percentage={completition} barColor={containerColor} />
          </div>
        </>
      )}

      <hr className={styles.divider} />

      {/* Footer: stack siempre visible, fecha y FTE solo en expanded */}
      <div className={styles.footer}>
        <div className={styles.stack}>
          {isExpanded ? (
            projectStack.map((element) => (
              <span key={element} className={styles.stackPill}>{element}</span>
            ))
          ) : (
            <>
              {projectStack[0] && (
                <span className={styles.stackPill}>{projectStack[0]}</span>
              )}
              {projectStack.length > 1 && (
                <span className={styles.stackPill}>+{projectStack.length - 1} más</span>
              )}
            </>
          )}
        </div>
        {isExpanded && (
          <div className={styles.meta}>
            <span>FTE: {projectFTE}</span>
            <span>Vence {formattedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
