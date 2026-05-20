import { useCallback, useEffect, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';
import { GRAPH_BY_ID, type GraphDescriptor } from '../config/graphCatalog';

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

export function useDashboardPreferences() {
  const { user } = useUser();
  const [overrides, setOverrides]             = useState<Map<string, boolean>>(() => new Map());
  const [layoutOverrides, setLayoutOverrides] = useState<Map<string, GraphLayoutItem>>(() => new Map());
  const [fetched, setFetched]                 = useState(false);

  const loading = user?.id != null && !fetched;
  const userId = user?.id;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from('usuario_grafica_visibilidad')
        .select('codigo_grafica, visible, grid_x, grid_y, grid_w, grid_h')
        .eq('id_usuario', user.id);

      if (cancelled) return;

      const nextVis    = new Map<string, boolean>();
      const nextLayout = new Map<string, GraphLayoutItem>();

      for (const row of data ?? []) {
        const id = row.codigo_grafica as string;
        nextVis.set(id, row.visible as boolean);
        if (row.grid_x != null && row.grid_y != null && row.grid_w != null && row.grid_h != null) {
          nextLayout.set(id, { i: id, x: row.grid_x, y: row.grid_y, w: row.grid_w, h: row.grid_h });
        }
      }

      setOverrides(nextVis);
      setLayoutOverrides(nextLayout);
      setFetched(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

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

  const getLayoutItems = useCallback((visibleGraphs: GraphDescriptor[], cols = 48): GraphLayoutItem[] => {
    let col = 0;
    let row = 0;

    return visibleGraphs.map(g => {
      const saved = layoutOverrides.get(g.id);
      if (saved) return { ...saved, minW: MIN_W, minH: MIN_H };

      const w = Math.min(g.defaultW, cols);
      const h = g.defaultH;

      if (w >= cols) {
        if (col > 0) { row += h; col = 0; }
        const item = { i: g.id, x: 0, y: row, w, h, minW: MIN_W, minH: MIN_H };
        row += h;
        col = 0;
        return item;
      }

      if (col + w > cols) {
        col = 0;
        row += h;
      }
      const item = { i: g.id, x: col, y: row, w, h, minW: MIN_W, minH: MIN_H };
      col += w;
      if (col >= cols) { col = 0; row += h; }
      return item;
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

  return { isVisible, toggle, loading, getLayoutItems, saveLayout };
}
