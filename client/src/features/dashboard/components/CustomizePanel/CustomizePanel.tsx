import { type FC, useEffect } from 'react';
import type { GraphDescriptor } from '../../config/graphCatalog';
import { VISIBILITY_BADGE } from '../../config/graphCatalog';
import styles from './CustomizePanel.module.css';

interface Props {
  open:         boolean;
  onClose:      () => void;
  available:    GraphDescriptor[];
  isVisible:    (id: string) => boolean;
  toggle:       (id: string) => void | Promise<void>;
  showBadge?:   boolean;
}

const CustomizePanel: FC<Props> = ({ open, onClose, available, isVisible, toggle, showBadge = true }) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-label="Personalizar dashboard">
        <header className={styles.header}>
          <h2 className={styles.title}>Personalizar dashboard</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <p className={styles.subtitle}>
          Activa o desactiva las gráficas que quieres ver. Los cambios se guardan automáticamente.
        </p>

        <ul className={styles.list}>
          {available.map(g => {
            const checked = isVisible(g.id);
            return (
              <li key={g.id} className={styles.item}>
                <label className={styles.itemLabel}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => void toggle(g.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.itemName}>{g.label}</span>
                  {showBadge && (
                    <span className={`${styles.badge} ${styles[`badge_${g.visibility.replace('-', '_')}`]}`}>
                      {VISIBILITY_BADGE[g.visibility]}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {available.length === 0 && (
          <p className={styles.empty}>No hay gráficas configurables para tu rol.</p>
        )}
      </aside>
    </>
  );
};

export default CustomizePanel;
