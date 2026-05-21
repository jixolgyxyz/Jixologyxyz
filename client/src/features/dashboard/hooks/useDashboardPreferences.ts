import { useCallback, useEffect, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';
import { GRAPH_BY_ID, GRAPH_CATALOG, type GraphDescriptor } from '../config/graphCatalog';

export interface GraphLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

const MIN_W = 8;
const MIN_H = 6;
const COLS  = 48;

interface PackInput { id: string; w: number; h: number }

/**
 * Packs a flat list of graphs left-to-right into a `cols`-wide grid and
 * returns each graph's top-left position. A full-width graph (w >= cols)
 * takes its own row. Single source of truth for the default layout.
 */
function packGraphs(graphs: PackInput[], cols = COLS): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let col = 0;
  let row = 0;

  for (const g of graphs) {
    const w = Math.min(g.w, cols);

    if (w >= cols) {
      if (col > 0) { row += g.h; col = 0; }
      positions.set(g.id, { x: 0, y: row });
      row += g.h;
      col = 0;
      continue;
    }

    if (col + w > cols) { col = 0; row += g.h; }
    positions.set(g.id, { x: col, y: row });
    col += w;
    if (col >= cols) { col = 0; row += g.h; }
  }

  return positions;
}

/**
 * Default positions for a seeded catalog: admin graphs and user graphs are
 * each packed independently from (0,0) so both dashboards start tidy.
 */
function computeDefaultPositions(catalog: GraphDescriptor[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const kind of ['admin', 'user'] as const) {
    const group = catalog
      .filter(g => g.defaultVisible && g.dashboards.includes(kind))
      .map(g => ({ id: g.id, w: g.defaultW, h: g.defaultH }));
    for (const [id, pos] of packGraphs(group)) positions.set(id, pos);
  }
  return positions;
}

/** Graphs a user is allowed to seed: admins get all, others get user/shared. */
function catalogForUser(isAdmin: boolean): GraphDescriptor[] {
  return isAdmin
    ? GRAPH_CATALOG
    : GRAPH_CATALOG.filter(g => g.visibility === 'user-only' || g.visibility === 'shared');
}

async function seedDefaultGraphs(userId: number, isAdmin: boolean) {
  const catalog   = catalogForUser(isAdmin);
  const positions = computeDefaultPositions(catalog);

  const rows = catalog.map(g => {
    const pos = positions.get(g.id);
    return {
      id_usuario:     userId,
      codigo_grafica: g.id,
      visible:        g.defaultVisible,
      grid_w:         g.defaultW,
      grid_h:         g.defaultH,
      grid_x:         pos?.x ?? null,
      grid_y:         pos?.y ?? null,
    };
  });

  const { error } = await supabase
    .from('usuario_grafica_visibilidad')
    .upsert(rows, { onConflict: 'id_usuario,codigo_grafica' });

  if (error) {
    console.error('No se pudieron guardar los valores por defecto de las gráficas:', error);
  }
}

export function useDashboardPreferences() {
  const { user } = useUser();
  const [overrides, setOverrides]             = useState<Map<string, boolean>>(() => new Map());
  const [layoutOverrides, setLayoutOverrides] = useState<Map<string, GraphLayoutItem>>(() => new Map());
  const [fetched, setFetched]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const loading = user?.id != null && !fetched;
  const userId = user?.id;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void (async () => {
      const { data, error: fetchError } = await supabase
        .from('usuario_grafica_visibilidad')
        .select('codigo_grafica, visible, grid_x, grid_y, grid_w, grid_h')
        .eq('id_usuario', user.id);

      if (cancelled) return;

      if (fetchError) {
        setError('No se pudieron cargar las preferencias del dashboard.');
        setFetched(true);
        return;
      }

      const nextVis    = new Map<string, boolean>();
      const nextLayout = new Map<string, GraphLayoutItem>();

      for (const row of data ?? []) {
        const id = row.codigo_grafica as string;
        nextVis.set(id, row.visible as boolean);
        if (row.grid_x != null && row.grid_y != null && row.grid_w != null && row.grid_h != null) {
          nextLayout.set(id, { i: id, x: row.grid_x, y: row.grid_y, w: row.grid_w, h: row.grid_h });
        }
      }

      // First visit — seed visibility + default positions from the catalog.
      if ((data ?? []).length === 0) {
        const isAdmin   = user.idRolGlobal === 1 || user.idRolGlobal === 2;
        const catalog   = catalogForUser(isAdmin);
        const positions = computeDefaultPositions(catalog);

        for (const g of catalog) {
          nextVis.set(g.id, g.defaultVisible);
          const pos = positions.get(g.id);
          if (pos) {
            nextLayout.set(g.id, {
              i: g.id, x: pos.x, y: pos.y,
              w: Math.min(g.defaultW, COLS), h: g.defaultH,
            });
          }
        }
        void seedDefaultGraphs(user.id, isAdmin);
      }

      setOverrides(nextVis);
      setLayoutOverrides(nextLayout);
      setError(null);
      setFetched(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id, user?.idRolGlobal]);

  const isVisible = useCallback((graphId: string): boolean => {
    if (overrides.has(graphId)) return overrides.get(graphId)!;
    return GRAPH_BY_ID[graphId]?.defaultVisible ?? false;
  }, [overrides]);

  const toggle = useCallback(async (graphId: string) => {
    if (!userId) return;

    const current = overrides.has(graphId)
      ? overrides.get(graphId)!
      : (GRAPH_BY_ID[graphId]?.defaultVisible ?? false);
    const next = !current;

    setOverrides(prev => {
        const m = new Map(prev);
        m.set(graphId, next);
        return m;
      });

    const { error } = await supabase
      .from('usuario_grafica_visibilidad')
      .upsert(
        { id_usuario: userId, codigo_grafica: graphId, visible: next },
        { onConflict: 'id_usuario,codigo_grafica' },
      );

    if (error) {
      console.error('No se pudo guardar la visibilidad de la gráfica:', error);
    }
  }, [userId, overrides]);

  const getLayoutItems = useCallback((visibleGraphs: GraphDescriptor[], cols = COLS): GraphLayoutItem[] => {
    // Graphs with a saved position keep it; the rest are packed among themselves.
    const unsaved = visibleGraphs.filter(g => !layoutOverrides.has(g.id));
    const packed  = packGraphs(unsaved.map(g => ({ id: g.id, w: g.defaultW, h: g.defaultH })), cols);

    return visibleGraphs.map(g => {
      const saved = layoutOverrides.get(g.id);
      if (saved) return { ...saved, minW: MIN_W, minH: MIN_H };

      const pos = packed.get(g.id)!;
      return {
        i: g.id, x: pos.x, y: pos.y,
        w: Math.min(g.defaultW, cols), h: g.defaultH,
        minW: MIN_W, minH: MIN_H,
      };
    });
  }, [layoutOverrides]);

  const saveLayout = useCallback(async (layout: Layout) => {
    if (!userId) return;

    setLayoutOverrides(prev => {
      const next = new Map(prev);
      layout.forEach(l => next.set(l.i, { i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
      return next;
    });

    const rows = layout.map(l => ({
      id_usuario:      userId,
      codigo_grafica:  l.i,
      visible:         overrides.has(l.i) ? overrides.get(l.i)! : (GRAPH_BY_ID[l.i]?.defaultVisible ?? false),
      grid_x:          l.x,
      grid_y:          l.y,
      grid_w:          l.w,
      grid_h:          l.h,
    }));

    const { error } = await supabase
      .from('usuario_grafica_visibilidad')
      .upsert(rows, { onConflict: 'id_usuario,codigo_grafica' });

    if (error) {
      console.error('No se pudo guardar el layout de la gráfica:', error);
    }
  }, [userId, overrides]);

  return { isVisible, toggle, loading, error, getLayoutItems, saveLayout };
}
