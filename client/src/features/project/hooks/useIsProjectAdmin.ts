import { useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/supabase.client';
import { useUser } from '@/core/auth/userContext';

export function useIsProjectAdmin(projectId: number) {
  const { user } = useUser();

  // Synchronous: admins/SAdmins always have access — no DB call needed
  const isGlobalAdmin = user?.idRolGlobal === 1 || user?.idRolGlobal === 2;

  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    // Skip the async check for global admins or missing context
    if (isGlobalAdmin || !user?.id || !projectId) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from('etiqueta_proyecto_predeterminada')
        .select('catalogo_etiqueta_proyecto_predeterminada(nombre)')
        .eq('id_usuario', user.id)
        .eq('id_proyecto', projectId);

      if (cancelled) return;

      const rows = data ?? [];
      const hasPm = rows.some((row) => {
        const cat = row.catalogo_etiqueta_proyecto_predeterminada;
        if (!cat) return false;
        const items = Array.isArray(cat) ? cat : [cat];
        return (items as { nombre: string }[]).some((item) => item.nombre === 'PM');
      });

      setIsPM(hasPm);
    })();

    return () => { cancelled = true; };
  }, [isGlobalAdmin, user?.id, projectId]);

  return { isProjectAdmin: isGlobalAdmin || isPM };
}
