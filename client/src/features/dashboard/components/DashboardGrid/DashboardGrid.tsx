import { type FC, type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
// react-grid-layout v2's default GridLayout takes grouped config props (gridConfig,
// dragConfig…) and silently ignores the v1 flat props this component uses. The
// `/legacy` wrapper accepts the v1 flat API (cols, rowHeight, margin, isDraggable,
// draggableHandle…) and converts it internally — so cols/rowHeight/margin take effect.
import GridLayout from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout';
import type { GraphDescriptor } from '../../config/graphCatalog';
import type { GraphLayoutItem } from '../../hooks/useDashboardPreferences';
import styles from './DashboardGrid.module.css';

interface DashboardGridProps {
  visible: GraphDescriptor[];
  getLayoutItems: (graphs: GraphDescriptor[], cols: number) => GraphLayoutItem[];
  saveLayout: (layout: Layout) => Promise<void>;
  /** When true, cards can be dragged (via the top strip) and resized. */
  reorganizeMode: boolean;
  renderItem: (g: GraphDescriptor) => ReactNode;
  showGrid?: boolean; // debug: shows grid cell boundaries
}

// Fine 48-column grid: resize snaps to one column (~38px wide), 4× finer than
// the original 12-column grid. 48 stays an exact multiple of 12, so the old
// catalog widths map to whole integers and RGL's integer layout stays clean.
const COLS = 48;
const ROW_HEIGHT = 10;
const MARGIN = 16;

// react-grid-layout's onLayoutChange fires with a brand-new array reference on
// every internal render. Feeding that straight back into state always re-renders
// (a new array never passes React's Object.is bail-out), the legacy wrapper then
// re-syncs and fires onLayoutChange again — an infinite loop ("Maximum update
// depth exceeded"). Comparing by value lets us keep the previous reference when
// nothing meaningful changed, which stops the loop.
const sameLayout = (a: Layout, b: Layout): boolean => {
  if (a.length !== b.length) return false;
  const byId = new Map(a.map(item => [item.i, item]));
  for (const q of b) {
    const p = byId.get(q.i);
    if (!p || p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h) return false;
  }
  return true;
};

const DashboardGrid: FC<DashboardGridProps> = ({
  visible,
  getLayoutItems,
  saveLayout,
  reorganizeMode,
  renderItem,
  showGrid = false,
}) => {
  // sidebar=55px + page padding 1.5rem×2=48px
  const [gridWidth, setGridWidth] = useState(() => Math.max(window.innerWidth - 103, 400));
  useEffect(() => {
    const update = () => setGridWidth(Math.max(window.innerWidth - 103, 400));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Local layout state — drives GridLayout as a controlled component.
  // Initialised from DB-loaded values (parent only renders this after loading=false).
  const [localLayout, setLocalLayout] = useState<Layout>(() => getLayoutItems(visible, COLS));

  // True while a drag or resize is in progress.
  const interacting = useRef(false);

  // When the visible graph list changes (add/remove via customize panel), re-sync
  // the layout during render (not in an effect) to avoid the cascading-render
  // lint error and to keep the update synchronous with the new visible array.
  const [syncedKey, setSyncedKey] = useState(() => visible.map(g => g.id).join(','));
  const currentKey = visible.map(g => g.id).join(',');
  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey);
    setLocalLayout(getLayoutItems(visible, COLS));
  }

  // While dragging/resizing: do NOT feed rounded-integer layout back as the controlled
  // prop — it resets react-grid-layout's internal float position and multiplies snap steps.
  // Only sync local state for non-interaction changes (initial load, item add/remove).
  const handleLayoutChange = useCallback((layout: Layout) => {
    if (interacting.current) return;
    // Keep the previous reference when nothing changed — see sameLayout above.
    setLocalLayout(prev => (sameLayout(prev, layout) ? prev : layout));
  }, []);

  const handleStart = useCallback(() => { interacting.current = true; }, []);

  // On stop: commit final layout to local state and persist to DB.
  const handleStop = useCallback((layout: Layout) => {
    interacting.current = false;
    setLocalLayout(layout);
    void saveLayout(layout);
  }, [saveLayout]);

  const colWidth = (gridWidth - MARGIN * (COLS + 1)) / COLS;
  const rowStep  = ROW_HEIGHT + MARGIN;

  return (
    <div
      className={`${styles.gridWrapper}${reorganizeMode ? ` ${styles.reorganizing}` : ''}`}
      style={{ position: 'relative' }}
    >
      {showGrid && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: [
            `repeating-linear-gradient(to right, rgba(59,130,246,0.25) 0px, rgba(59,130,246,0.25) 1px, transparent 1px, transparent ${colWidth + MARGIN}px)`,
            `repeating-linear-gradient(to bottom, rgba(239,68,68,0.20) 0px, rgba(239,68,68,0.20) 1px, transparent 1px, transparent ${rowStep}px)`,
          ].join(', '),
          backgroundPosition: `${MARGIN}px ${MARGIN}px`,
        }} />
      )}
      <GridLayout
        className={styles.gridLayout}
        layout={localLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={gridWidth}
        isDraggable={reorganizeMode}
        isResizable={reorganizeMode}
        draggableHandle={`.${styles.dragHandle}`}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleStart}
        onResizeStart={handleStart}
        onDragStop={handleStop}
        onResizeStop={handleStop}
        margin={[MARGIN, MARGIN]}
      >
        {visible.map(g => (
          <div key={g.id} className={styles.gridItem}>
            {reorganizeMode && <div className={styles.dragHandle} title="Arrastrar" />}
            {renderItem(g)}
          </div>
        ))}
      </GridLayout>
    </div>
  );
};

export default DashboardGrid;
