import { type FC, type ReactElement, useEffect, useRef, useState } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { ChartType, GraphDescriptor } from '../../config/graphCatalog';
import { VISIBILITY_BADGE } from '../../config/graphCatalog';
import SearchBarComponent from '@/shared/components/SearchBarComponent/SearchBarComponent';
import styles from './CustomizePanel.module.css';

const CHART_TYPE_LABEL: Record<ChartType, string> = {
  'bar':      'Barras V.',
  'bar-h':    'Barras H.',
  'donut':    'Dona',
  'scatter':  'Dispersión',
  'bubble':   'Burbujas',
  'stacked':  'Apilado',
  'list':     'Lista',
  'progress': 'Progreso',
};

function ChartTypeFilterBubble({ value, types, onChange }: {
  value: ChartType | null;
  types: ChartType[];
  onChange: (v: ChartType | null) => void;
}) {
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

  const iconClass = (t: ChartType) => `${styles.menuIcon} ${styles[`chartIcon_${t.replace('-', '_')}`]}`;

  return (
    <div ref={ref} className={styles.bubble}>
      <button
        type="button"
        className={`${styles.bubbleBtn} ${value !== null ? styles.bubbleBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {value !== null ? (
          <span className={iconClass(value)} style={{ width: 18, height: 18, borderRadius: 4 }}>
            {CHART_ICON[value]}
          </span>
        ) : (
          <span>Tipo</span>
        )}
        <ChevronDownIcon width={11} height={11} />
      </button>
      {open && (
        <div className={styles.bubbleMenu} onClick={() => setOpen(false)}>
          {types.map(t => (
            <button
              key={t}
              type="button"
              className={`${styles.bubbleMenuItem} ${value === t ? styles.bubbleMenuItemActive : ''}`}
              onClick={() => onChange(value === t ? null : t)}
            >
              <span className={iconClass(t)} style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0 }}>
                {CHART_ICON[t]}
              </span>
              {CHART_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini chart-type icons ─────────────────────────────────────────────
const CHART_ICON: Record<ChartType, ReactElement> = {
  bar: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <rect x="2"  y="11" width="3.5" height="7" rx="0.8" />
      <rect x="7"  y="7"  width="3.5" height="11" rx="0.8" />
      <rect x="12" y="4"  width="3.5" height="14" rx="0.8" />
      <rect x="17" y="9"  width="3.5" height="9"  rx="0.8" />
    </svg>
  ),
  'bar-h': (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <rect x="2" y="2.5" width="11" height="3" rx="0.8" />
      <rect x="2" y="7"   width="15" height="3" rx="0.8" />
      <rect x="2" y="11.5" width="8" height="3" rx="0.8" />
      <rect x="2" y="16"  width="13" height="3" rx="0.8" />
    </svg>
  ),
  donut: (
    /* r=7 → circumference ≈ 43.98; segments: 50% / 30% / 18% with tiny gaps */
    <svg viewBox="0 0 20 20" width="16" height="16">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="4.5"
        strokeDasharray="21.5 22.5" strokeDashoffset="11" />
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="4.5"
        strokeDasharray="12.9 31.1" strokeDashoffset="-11.3" opacity="0.55" />
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="4.5"
        strokeDasharray="7.8 36.2" strokeDashoffset="-24.2" opacity="0.3" />
    </svg>
  ),
  scatter: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <circle cx="4"  cy="15" r="1.6" />
      <circle cx="8"  cy="10" r="1.6" />
      <circle cx="11" cy="13" r="1.6" />
      <circle cx="14" cy="6"  r="1.6" />
      <circle cx="17" cy="9"  r="1.6" />
      <circle cx="6"  cy="5"  r="1.6" />
    </svg>
  ),
  bubble: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <circle cx="5"  cy="13" r="2.5" opacity="0.7" />
      <circle cx="13" cy="7"  r="4"   opacity="0.7" />
      <circle cx="15" cy="15" r="2"   opacity="0.7" />
    </svg>
  ),
  stacked: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <rect x="2"  y="13" width="4" height="5" rx="0.6" opacity="1"   />
      <rect x="2"  y="8"  width="4" height="4" rx="0.6" opacity="0.65"/>
      <rect x="8"  y="10" width="4" height="8" rx="0.6" opacity="1"   />
      <rect x="8"  y="6"  width="4" height="3" rx="0.6" opacity="0.65"/>
      <rect x="14" y="12" width="4" height="6" rx="0.6" opacity="1"   />
      <rect x="14" y="7"  width="4" height="4" rx="0.6" opacity="0.65"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <rect x="2"  y="4"  width="16" height="2.5" rx="1" />
      <rect x="2"  y="9"  width="12" height="2.5" rx="1" />
      <rect x="2"  y="14" width="14" height="2.5" rx="1" />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <rect x="2" y="4"  width="16" height="2.5" rx="1.2" opacity="0.25"/>
      <rect x="2" y="4"  width="11" height="2.5" rx="1.2" />
      <rect x="2" y="9"  width="16" height="2.5" rx="1.2" opacity="0.25"/>
      <rect x="2" y="9"  width="14" height="2.5" rx="1.2" />
      <rect x="2" y="14" width="16" height="2.5" rx="1.2" opacity="0.25"/>
      <rect x="2" y="14" width="7"  height="2.5" rx="1.2" />
    </svg>
  ),
};

interface Props {
  open:                boolean;
  onClose:             () => void;
  available:           GraphDescriptor[];
  isVisible:           (id: string) => boolean;
  toggle:              (id: string) => void | Promise<void>;
  showBadge?:          boolean;
  projects?:           { id: number; nombre: string }[];
  selectedProjectIds?: number[] | null;
  onProjectChange?:    (ids: number[] | null) => void;
}

const CustomizePanel: FC<Props> = ({
  open,
  onClose,
  available,
  isVisible,
  toggle,
  showBadge = true,
  projects,
  selectedProjectIds,
  onProjectChange,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => available[0]?.id ?? null,
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [graphSearch,     setGraphSearch]     = useState('');
  const [graphTypeFilter, setGraphTypeFilter] = useState<ChartType | null>(null);

  const validSelectedId =
    selectedId && available.find(g => g.id === selectedId)
      ? selectedId
      : (available[0]?.id ?? null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const uniqueTypes = Array.from(new Set(available.map(g => g.chartType)));

  const visibleList = available.filter(g => {
    if (graphSearch && !g.label.toLowerCase().includes(graphSearch.toLowerCase())) return false;
    if (graphTypeFilter && g.chartType !== graphTypeFilter) return false;
    return true;
  });

  const selectedGraph = available.find(g => g.id === validSelectedId) ?? null;
  const checked = selectedGraph ? isVisible(selectedGraph.id) : false;

  const toggleProject = (id: number) => {
    if (!onProjectChange) return;
    const ids = selectedProjectIds ?? null;
    if (ids === null) {
      onProjectChange([id]);
    } else if (ids.includes(id)) {
      const next = ids.filter(x => x !== id);
      onProjectChange(next.length === 0 ? null : next);
    } else {
      onProjectChange([...ids, id]);
    }
  };

  const isProjectSelected = (id: number) =>
    selectedProjectIds == null || selectedProjectIds.includes(id);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <aside className={styles.panel} role="dialog" aria-label="Personalizar dashboard">

        {/* ── Shared header ──────────────────────────────────────────── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.codeBadge}>Personalizar</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <XMarkIcon style={{ width: '1.25rem', height: '1.25rem', display: 'block', flexShrink: 0 }} />
          </button>
        </header>

        {/* ── Two-column body ────────────────────────────────────────── */}
        <div className={styles.body}>

          {/* LEFT — graph card list */}
          <div className={styles.left}>
            <div className={styles.leftSearch}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SearchBarComponent
                  infoText="Buscar gráfica…"
                  onChange={setGraphSearch}
                  fontSize="0.78rem"
                />
              </div>
              <ChartTypeFilterBubble
                value={graphTypeFilter}
                types={uniqueTypes}
                onChange={setGraphTypeFilter}
              />
            </div>

            {available.length === 0 ? (
              <p className={styles.empty}>No hay gráficas configurables para tu rol.</p>
            ) : (
              <ul className={styles.list}>
                {visibleList.length === 0 ? (
                  <p className={styles.empty}>Sin resultados.</p>
                ) : visibleList.map(g => {
                  const active  = g.id === validSelectedId;
                  const visible = isVisible(g.id);
                  return (
                    <li
                      key={g.id}
                      className={`${styles.card} ${active ? styles.cardActive : ''} ${!visible ? styles.cardHidden : ''}`}
                      onClick={() => setSelectedId(g.id)}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={e => { e.stopPropagation(); void toggle(g.id); }}
                        className={styles.checkbox}
                        onClick={e => e.stopPropagation()}
                      />

                      {/* Label + description */}
                      <div className={styles.cardText}>
                        <span className={styles.cardLabel}>{g.label}</span>
                        <span className={styles.cardDesc}>{g.description}</span>
                      </div>

                      {/* Chart type icon */}
                      <div className={`${styles.chartIcon} ${styles[`chartIcon_${g.chartType.replace('-', '_')}`]}`}>
                        {CHART_ICON[g.chartType]}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* RIGHT — config for selected graph */}
          <div className={styles.right}>
            {selectedGraph ? (
              <>
                {/* Chart icon + name */}
                <div className={`${styles.rightIconWrap} ${styles[`chartIcon_${selectedGraph.chartType.replace('-', '_')}`]}`}>
                  {CHART_ICON[selectedGraph.chartType]}
                </div>
                <h3 className={styles.graphTitle}>{selectedGraph.label}</h3>
                <p className={styles.graphDesc}>{selectedGraph.description}</p>

                {/* Visibility toggle */}
                <div className={styles.row}>
                  <span className={styles.rowLabel}>VISIBLE</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
                    onClick={() => void toggle(selectedGraph.id)}
                  >
                    <span className={styles.toggleThumb} />
                    <span className={styles.toggleText}>
                      {checked ? 'Activada' : 'Oculta'}
                    </span>
                  </button>
                </div>

                <div className={styles.divider} />

                {/* Type badge — only when showBadge */}
                {showBadge && (
                  <>
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>TIPO</span>
                      <span className={`${styles.badge} ${styles[`badge_${selectedGraph.visibility.replace(/-/g, '_')}`]}`}>
                        {VISIBILITY_BADGE[selectedGraph.visibility]}
                      </span>
                    </div>
                    <div className={styles.divider} />
                  </>
                )}

                {/* Project filter */}
                {projects && projects.length > 0 && onProjectChange && (
                  <>
                    <div className={styles.rowLabel} style={{ marginBottom: '8px' }}>PROYECTOS</div>
                    <div className={styles.projectList}>
                      <label className={styles.projectRow}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedProjectIds == null || selectedProjectIds.length === 0}
                          onChange={() => onProjectChange(null)}
                        />
                        <span className={styles.projectName}>Todos los proyectos</span>
                      </label>
                      {projects.map(p => (
                        <label key={p.id} className={styles.projectRow}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isProjectSelected(p.id)}
                            onChange={() => toggleProject(p.id)}
                          />
                          <span className={styles.projectName}>{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                    <div className={styles.divider} />
                  </>
                )}

                {/* Date range */}
                <div className={styles.rowLabel} style={{ marginBottom: '10px' }}>PERÍODO</div>
                <div className={styles.dateGroup}>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>Desde</label>
                    <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>Hasta</label>
                    <input type="date" className={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
                <p className={styles.dateHint}>El filtro de período estará disponible próximamente.</p>
              </>
            ) : (
              <p className={styles.empty}>Selecciona una gráfica de la lista.</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default CustomizePanel;
