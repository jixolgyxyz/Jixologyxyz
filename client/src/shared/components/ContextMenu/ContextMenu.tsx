import React, { useState, useRef, useLayoutEffect } from 'react';

// --- Estilos ---
import styles from './ContextMenu.module.css';

// --- Interfaces ---

export interface SubMenuItem {
  text: string;
  statusId?: number;
  onClick: () => void;
}

export interface MenuComponent {
  text: string;
  onClick: () => void;
  subMenu?: SubMenuItem[];
}

interface IContextMenuProps {
  elements: MenuComponent[] | undefined;
}

const ContextMenu: React.FC<IContextMenuProps> = ({ elements }) => {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!subMenuRef.current) return;
    const rect = subMenuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      subMenuRef.current.style.left  = 'auto';
      subMenuRef.current.style.right = '100%';
    }
    subMenuRef.current.style.visibility = 'visible';
  }, [openSubMenu]);

  return (
    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
      {elements!.map((element, index) => (
        <React.Fragment key={element.text}>
          <div
            className={`${styles.element} ${element.subMenu ? styles.hasSubMenu : ''}`}
            onClick={element.subMenu ? undefined : element.onClick}
            onMouseEnter={() => element.subMenu ? setOpenSubMenu(element.text) : setOpenSubMenu(null)}
            onMouseLeave={() => element.subMenu ? undefined : setOpenSubMenu(null)}
          >
            {element.text}
            {element.subMenu && <span className={styles.arrow}>›</span>}

            {element.subMenu && openSubMenu === element.text && (
              <div
                ref={subMenuRef}
                className={styles.subMenu}
                style={{ visibility: 'hidden' }}
                onMouseLeave={() => setOpenSubMenu(null)}
              >
                {element.subMenu.map((sub) => (
                  <div
                    key={sub.text}
                    className={styles.subMenuItem}
                    onClick={sub.onClick}
                  >
                    {sub.statusId !== undefined
                      ? <span className={`${styles.statusPill} status-${getStatusClass(sub.statusId)}`}>{sub.text}</span>
                      : sub.text
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
          {index < elements!.length - 1 && <hr className={styles.divider} />}
        </React.Fragment>
      ))}
    </div>
  );
};

function getStatusClass(statusId: number): string {
  const map: Record<number, string> = {
    1: 'completed',
    2: 'onTrack',
    3: 'delayed',
    4: 'unassigned',
  };
  return map[statusId] ?? 'unassigned';
}

export default ContextMenu;
