import { useEffect, useState } from 'react';
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
}

export function useDashboardPreferences() {
  const { user } = useUser();
  const [overrides, setOverrides]             = useState<Map<string, boolean>>(() => new Map());
  const [layoutOverrides, setLayoutOverrides] = useState<Map<string, GraphLayoutItem>>(() => new Map());
  const [fetched, setFetched]                 = useState(false);

  const loading = user?.id != null && !fetched;

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

  const isVisible = (graphId: string): boolean => {
    if (overrides.has(graphId)) return overrides.get(graphId)!;
    return GRAPH_BY_ID[graphId]?.defaultVisible ?? false;
  };

  const toggle = async (graphId: string) => {
    if (!user?.id) return;

    const next = !isVisible(graphId);

    setOverrides(prev => {
      const m = new Map(prev);
      m.set(graphId, next);
      return m;
    });

    const { error } = await supabase
      .from('usuario_grafica_visibilidad')
      .upsert(
        { id_usuario: user.id, codigo_grafica: graphId, visible: next },
        { onConflict: 'id_usuario,codigo_grafica' },
      );

    if (error) {
      console.error('No se pudo guardar la visibilidad de la gráfica:', error);
    }
  };

  // Returns react-grid-layout Layout items for the given visible graphs.
  // Uses saved positions when available, otherwise computes a default left-to-right packing.
  const getLayoutItems = (visibleGraphs: GraphDescriptor[], cols = 6): GraphLayoutItem[] => {
    let col = 0;
    let row = 0;

    return visibleGraphs.map(g => {
      const saved = layoutOverrides.get(g.id);
      if (saved) return saved;

      const w = Math.min(g.defaultW, cols);
      const h = g.defaultH;

      // Full-width items always start on a fresh row
      if (w >= cols) {
        if (col > 0) { row += h; col = 0; }
        const item = { i: g.id, x: 0, y: row, w, h };
        row += h;
        col = 0;
        return item;
      }

      if (col + w > cols) {
        col = 0;
        row += h;
      }
      const item = { i: g.id, x: col, y: row, w, h };
      col += w;
      if (col >= cols) { col = 0; row += h; }
      return item;
    });
  };

  const saveLayout = async (layout: Layout[]) => {
    if (!user?.id) return;

    setLayoutOverrides(prev => {
      const next = new Map(prev);
      layout.forEach(l => next.set(l.i, { i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
      return next;
    });

    const rows = layout.map(l => ({
      id_usuario:      user.id,
      codigo_grafica:  l.i,
      visible:         isVisible(l.i),
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
  };

  return { isVisible, toggle, loading, getLayoutItems, saveLayout };
}
