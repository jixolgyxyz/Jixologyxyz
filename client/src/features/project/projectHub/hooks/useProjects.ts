import { useEffect, useState, useCallback } from 'react';

// --- Servicios ---
import { getProjects } from '../services/projects.services';

// --- Tipos ---
import type { Project } from '../types/Project';

export function useProjectCards(
  globalRole: number | null | undefined,
  userId: number | null | undefined,
  userLoading: boolean,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (userLoading || globalRole == null || userId == null) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProjects(globalRole, userId);
      setProjects(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error al obtener proyectos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [globalRole, userId, userLoading]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { projects, setProjects, loading, error, refetch };
}