import { type FC, type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import type { GraphDescriptor } from '../../config/graphCatalog';
import type { GraphLayoutItem } from '../../hooks/useDashboardPreferences';
import styles from './DashboardGrid.module.css';

interface DashboardGridProps {
  visible: GraphDescriptor[];
  getLayoutItems: (graphs: GraphDescriptor[], cols: number) => GraphLayoutItem[];
  saveLayout: (layout: Layout[]) => Promise<void>;
  showCustomizePanel: boolean;
  renderItem: (g: GraphDescriptor) => ReactNode;
  showGrid?: boolean; // debug: shows grid cell boundaries
}

const COLS = 12;
const ROW_HEIGHT = 10;
const MARGIN = 16;

const DashboardGrid: FC<DashboardGridProps> = ({
  visible,
  getLayoutItems,
  saveLayout,
  showCustomizePanel,
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
  const [localLayout, setLocalLayout] = useState<Layout[]>(() => getLayoutItems(visible, 12));

  // True while a drag or resize is in progress.
  const interacting = useRef(false);

  // When the visible graph list changes (add/remove via customize panel), re-sync.
  const prevVisibleKey = useRef(visible.map(g => g.id).join(','));
  useEffect(() => {
    const key = visible.map(g => g.id).join(',');
    if (key !== prevVisibleKey.current) {
      prevVisibleKey.current = key;
      setLocalLayout(getLayoutItems(visible, 12));
    }
  }, [visible, getLayoutItems]);

  // While dragging/resizing: do NOT feed rounded-integer layout back as the controlled
  // prop — it resets react-grid-layout's internal float position and multiplies snap steps.
  // Only sync local state for non-interaction changes (initial load, item add/remove).
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    if (!interacting.current) setLocalLayout(layout);
  }, []);

  const handleStart = useCallback(() => { interacting.current = true; }, []);

  // On stop: commit final layout to local state and persist to DB.
  const handleStop = useCallback((layout: Layout[]) => {
    interacting.current = false;
    setLocalLayout(layout);
    void saveLayout(layout);
  }, [saveLayout]);

  const colWidth = (gridWidth - MARGIN * (COLS + 1)) / COLS;
  const rowStep  = ROW_HEIGHT + MARGIN;

  return (
    <div className={styles.gridWrapper} style={{ position: 'relative' }}>
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
        isDraggable={showCustomizePanel}
        isResizable={showCustomizePanel}
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
            {showCustomizePanel && <div className={styles.dragHandle} title="Arrastrar" />}
            {renderItem(g)}
          </div>
        ))}
      </GridLayout>
    </div>
  );
};

export default DashboardGrid;
