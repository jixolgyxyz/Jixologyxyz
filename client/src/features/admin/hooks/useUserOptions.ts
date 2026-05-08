import { useEffect, useState } from 'react';
import {
  getRolGlobalOptions,
  getZonaHorariaOptions,
  type RolGlobalOption,
  type ZonaHorariaOption,
} from '../services/adminUserOptions.service';

export function useRegisterUserOptions() {
  const [roles, setRoles] = useState<RolGlobalOption[]>([]);
  const [zonasHorarias, setZonasHorarias] = useState<ZonaHorariaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [rolesData, zonasData] = await Promise.all([
          getRolGlobalOptions(),
          getZonaHorariaOptions(),
        ]);

        if (cancelled) return;

        setRoles(rolesData);
        setZonasHorarias(zonasData);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las opciones del formulario.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    roles,
    zonasHorarias,
    loading,
    error,
  };
}