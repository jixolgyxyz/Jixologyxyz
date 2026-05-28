import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BugAntIcon, BookOpenIcon, BoltIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';
import styles from './SprintBar.module.css';
import type { CalendarSprintRecord } from '../../types/calendar.types';

function TaskIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 8L7.5 10.5L11 5.5" />
    </svg>
  );
}

function SubtaskIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1.5" y1="0.5" x2="1.5" y2="12.5" />
      <line x1="1.5" y1="4"   x2="5" y2="4" />
      <line x1="1.5" y1="12.5" x2="5" y2="12.5" />
      <rect x="5" y="1" width="6" height="6" />
      <path d="M6.5 4L7.5 6.5L11.5 1.5" />
      <rect x="5" y="9.5" width="6" height="6" />
      <path d="M6.5 12.5L7.5 15L11.5 10" />
    </svg>
  );
}

type ItemTypeName = 'Bug' | 'Tarea' | 'Subtarea' | 'Historia de Usuario' | 'Épica';

const TYPE_ICONS: Record<ItemTypeName, React.ReactNode> = {
  Bug:                   <BugAntIcon   width={14} height={14} />,
  Tarea:                 <TaskIcon />,
  Subtarea:              <SubtaskIcon />,
  'Historia de Usuario': <BookOpenIcon width={14} height={14} />,
  'Épica':               <BoltIcon     width={14} height={14} />,
};

interface SprintBarProps {
  sprint: CalendarSprintRecord;
  instanceKey: string;
  colStart: number;
  colEnd: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
  color: string;
  activeKey: string | null;
  onActivate: (key: string) => void;
  onDeactivate: (key: string) => void;
}

interface BacklogItem {
  id: number;
  nombre: string;
  fecha_vencimiento: string | null;
  id_prioridad: number | null;
  complejidad: number | null;
  tiempo: number | null;
  tiempo_estimado: number | null;
  tipo_backlog_item:      { nombre: string } | null;
  prioridad_backlog_item: { nombre: string } | null;
  estatus_backlog_item:   { nombre: string; es_terminal: boolean } | null;
}

const CARD_W           = 260;
const DETAIL_CARD_W    = 220;
const OFFSET           = 14;
const MAX_ITEMS        = 6;
const CARD_H_EST       = 300;
const DETAIL_CARD_H_EST = 220;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${months[m - 1]} ${y}`;
}

function formatTimeLeft(estimado: number | null, real: number | null): string | null {
  if (estimado == null) return null;
  const spent = real ?? 0;
  const diff = estimado - spent;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (min > 0) parts.push(`${min}m`);
  if (parts.length === 0) parts.push('0m');
  return diff >= 0 ? `${parts.join(' ')} restante` : `${parts.join(' ')} sobre estimado`;
}

const SprintBar: React.FC<SprintBarProps> = ({
  sprint, instanceKey, colStart, colEnd, lane, isStart, isEnd, color,
  activeKey, onActivate, onDeactivate,
}) => {
  const navigate        = useNavigate();
  const { user }        = useUser();
  const hideTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemHoverTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetched      = useRef(false);

  const [anchor,        setAnchor]        = useState<{ x: number; y: number; flipY: boolean } | null>(null);
  const [items,         setItems]         = useState<BacklogItem[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [hoveredItem,   setHoveredItem]   = useState<BacklogItem | null>(null);
  const [itemCardY,     setItemCardY]     = useState(0);

  const isActive = activeKey === instanceKey;

  const wrapperClass = [
    styles.wrapper,
    isStart ? styles.roundedLeft  : styles.flatLeft,
    isEnd   ? styles.roundedRight : styles.flatRight,
  ].join(' ');

  // ── Bar visibility timers ───────────────────────────────
  const cancelHide       = () => { if (hideTimer.current)       clearTimeout(hideTimer.current); };
  const cancelActivation = () => { if (activationTimer.current) clearTimeout(activationTimer.current); };
  const scheduleHide     = () => { hideTimer.current = setTimeout(() => onDeactivate(instanceKey), 150); };

  const doActivate = (x: number, y: number) => {
    onActivate(instanceKey);
    const flipY = y + CARD_H_EST > window.innerHeight - 16;
    setAnchor({ x, y, flipY });
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    supabase
      .from('backlog_item')
      .select('id, nombre, fecha_vencimiento, id_prioridad, complejidad, tiempo, tiempo_estimado, tipo_backlog_item(nombre), prioridad_backlog_item(nombre), estatus_backlog_item(nombre, es_terminal)')
      .eq('id_sprint', sprint.id)
      .eq('id_usuario_responsable', user?.id ?? -1)
      .order('id_prioridad', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        const all = (data as unknown as BacklogItem[]) ?? [];
        setItems(all.filter(item => !item.estatus_backlog_item?.es_terminal));
        setLoading(false);
      });
  };

  const handleBarEnter = (e: React.MouseEvent) => {
    cancelHide();
    cancelActivation();
    const x = e.clientX + OFFSET + CARD_W > window.innerWidth
      ? e.clientX - CARD_W - OFFSET
      : e.clientX + OFFSET;
    if (activeKey === instanceKey) {
      // Re-entering the bar while its own card is open — cancel the hide, keep card alive
      doActivate(x, e.clientY);
    } else {
      // First hover: 400ms; switching bars: 250ms
      const delay = activeKey === null ? 400 : 250;
      activationTimer.current = setTimeout(() => doActivate(x, e.clientY), delay);
    }
  };

  const handleBarLeave = () => {
    cancelActivation();
    scheduleHide();
  };

  // ── Item detail hover ───────────────────────────────────
  const handleItemEnter = (item: BacklogItem, e: React.MouseEvent) => {
    if (itemHoverTimer.current) clearTimeout(itemHoverTimer.current);
    itemHoverTimer.current = setTimeout(() => {
      setHoveredItem(item);
      setItemCardY(e.clientY);
    }, 120);
  };

  const handleItemLeave = () => {
    if (itemHoverTimer.current) clearTimeout(itemHoverTimer.current);
    setHoveredItem(null);
  };

  // Position detail card to the right of the sprint card (flip left if needed)
  const detailCardX = anchor
    ? (anchor.x + CARD_W + 8 + DETAIL_CARD_W > window.innerWidth
        ? anchor.x - DETAIL_CARD_W - 8
        : anchor.x + CARD_W + 8)
    : 0;

  const visibleItems = items.slice(0, MAX_ITEMS);
  const overflow     = items.length - MAX_ITEMS;

  return (
    <>
      {/* ── Sprint bar ─────────────────────────────────── */}
      <div
        className={wrapperClass}
        style={{
          gridColumn: `${colStart} / ${colEnd + 1}`,
          gridRow: lane + 1,
          backgroundColor: color,
          cursor: 'pointer',
        }}
        onMouseEnter={handleBarEnter}
        onMouseLeave={handleBarLeave}
        onClick={() => navigate(`/proyectos/${sprint.id_proyecto}/backlog`)}
      >
        {isStart && (
          <span className={styles.label}>
            {sprint.nombre}
            <span className={styles.projectLabel}> · {sprint.project_nombre}</span>
          </span>
        )}
      </div>

      {/* ── Sprint summary card ────────────────────────── */}
      {isActive && anchor && ReactDOM.createPortal(
        <div
          className={styles.card}
          style={{
            left: anchor.x,
            ...(anchor.flipY
              ? { bottom: window.innerHeight - anchor.y }
              : { top: anchor.y }),
          }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          <div className={styles.cardAccent} style={{ backgroundColor: color }} />
          <div className={styles.cardBody}>
            <p className={styles.cardTitle}>{sprint.nombre}</p>
            <p className={styles.cardProject}>{sprint.project_nombre}</p>
            <p className={styles.cardDates}>
              {formatDate(sprint.fecha_inicio)}
              <span className={styles.cardArrow}> → </span>
              {formatDate(sprint.fecha_final)}
            </p>

            <div className={styles.divider} />

            {loading ? (
              <p className={styles.cardEmpty}>Cargando...</p>
            ) : items.length === 0 ? (
              <p className={styles.cardEmpty}>Sin ítems asignados a ti</p>
            ) : (
              <ul className={styles.itemList}>
                {visibleItems.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={styles.itemBtn}
                      onMouseEnter={e => handleItemEnter(item, e)}
                      onMouseLeave={handleItemLeave}
                      onClick={() => navigate(`/proyectos/${sprint.id_proyecto}/backlog?item=${item.id}`)}
                    >
                      <span className={styles.itemIcon} style={{ color }}>
                        {TYPE_ICONS[item.tipo_backlog_item?.nombre as ItemTypeName] ?? <TaskIcon />}
                      </span>
                      <span className={styles.itemName}>{item.nombre}</span>
                      {item.fecha_vencimiento && (
                        <span className={styles.itemDue}>{formatDate(item.fecha_vencimiento)}</span>
                      )}
                    </button>
                  </li>
                ))}
                {overflow > 0 && (
                  <li className={styles.overflow}>+{overflow} más</li>
                )}
              </ul>
            )}

            <div className={styles.divider} />
            <button
              type="button"
              className={styles.backlogLink}
              onClick={() => navigate(`/proyectos/${sprint.id_proyecto}/backlog`)}
            >
              Ver backlog completo →
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Item detail card ───────────────────────────── */}
      {isActive && hoveredItem && anchor && ReactDOM.createPortal(
        <div
          className={styles.detailCard}
          style={{
            left: detailCardX,
            ...(itemCardY + DETAIL_CARD_H_EST > window.innerHeight - 16
              ? { bottom: window.innerHeight - itemCardY }
              : { top: itemCardY }),
          }}
          onMouseEnter={() => { if (itemHoverTimer.current) clearTimeout(itemHoverTimer.current); }}
          onMouseLeave={handleItemLeave}
        >
          <div className={styles.cardAccent} style={{ backgroundColor: color }} />
          <div className={styles.detailBody}>
            <p className={styles.detailTitle}>{hoveredItem.nombre}</p>
            <div className={styles.divider} />

            {hoveredItem.estatus_backlog_item && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Estado</span>
                <span className={styles.detailValue}>{hoveredItem.estatus_backlog_item.nombre}</span>
              </div>
            )}
            {hoveredItem.prioridad_backlog_item && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Prioridad</span>
                <span className={styles.detailValue}>{hoveredItem.prioridad_backlog_item.nombre}</span>
              </div>
            )}
            {hoveredItem.complejidad != null && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Complejidad</span>
                <span className={styles.detailComplexity}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`${styles.dot} ${i < hoveredItem.complejidad! ? styles.dotFilled : ''}`}
                      style={i < hoveredItem.complejidad! ? { backgroundColor: color } : undefined}
                    />
                  ))}
                  <span className={styles.detailValue}>{hoveredItem.complejidad}/5</span>
                </span>
              </div>
            )}
            {hoveredItem.fecha_vencimiento && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Vencimiento</span>
                <span className={styles.detailValue}>{formatDate(hoveredItem.fecha_vencimiento)}</span>
              </div>
            )}
            {(() => {
              const tl = formatTimeLeft(hoveredItem.tiempo_estimado, hoveredItem.tiempo);
              if (!tl) return null;
              const over = tl.includes('sobre');
              return (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Tiempo</span>
                  <span className={styles.detailValue} style={over ? { color: '#b91c1c' } : undefined}>{tl}</span>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default SprintBar;
