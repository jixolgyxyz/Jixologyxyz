import { useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';
import { GRAPH_BY_ID } from '../config/graphCatalog';

// Per-user overrides stored in usuario_grafica_visibilidad. Rows that don't
// exist for a given graph code fall back to the catalog's `defaultVisible`.
//
// `toggle` does an optimistic local update then upserts to the DB. We don't
// roll back on error — failure leaves the user with a wrong checkbox state
// until the next fetch, but the chart still respects the local state.

export function useDashboardPreferences() {
  const { user } = useUser();
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map());
  const [fetched, setFetched]     = useState(false);

  // Derived: loading only while we have a user but haven't completed the fetch
  const loading = user?.id != null && !fetched;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from('usuario_grafica_visibilidad')
        .select('codigo_grafica, visible')
        .eq('id_usuario', user.id);

      if (cancelled) return;

      const next = new Map<string, boolean>();
      for (const row of data ?? []) {
        next.set(row.codigo_grafica as string, row.visible as boolean);
      }
      setOverrides(next);
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

    // Optimistic local update
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

  return { isVisible, toggle, loading };
}
