import { useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';

// Returns the Set of project IDs where the current user holds the "PM"
// default-label (etiqueta_proyecto_predeterminada → catalogo …nombre = 'PM').
//
// Mirrors the query in useIsProjectAdmin but without scoping to one project.
// Global admins get an empty set: the dashboard layer should fall back to
// "admin sees everything" before consulting this hook.
export function usePmProjects() {
  const { user } = useUser();
  const [projectIds, setProjectIds] = useState<Set<number>>(() => new Set());
  const [fetched, setFetched]       = useState(false);

  // Loading is derived: only true when we have a user but haven't completed the fetch yet
  const loading = user?.id != null && !fetched;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from('etiqueta_proyecto_predeterminada')
        .select('id_proyecto, catalogo_etiqueta_proyecto_predeterminada(nombre)')
        .eq('id_usuario', user.id);

      if (cancelled) return;

      const ids = new Set<number>();
      for (const row of data ?? []) {
        const cat = row.catalogo_etiqueta_proyecto_predeterminada;
        const items = Array.isArray(cat) ? cat : cat ? [cat] : [];
        const isPm = (items as { nombre: string }[]).some(i => i.nombre === 'PM');
        if (isPm) ids.add(row.id_proyecto as number);
      }

      setProjectIds(ids);
      setFetched(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  return { projectIds, loading };
}
