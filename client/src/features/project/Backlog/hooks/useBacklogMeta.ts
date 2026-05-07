import { useCallback, useEffect, useState } from 'react';
import {
  fetchBacklogStatuses,
  fetchBacklogPriorities,
  fetchBacklogTypes,
  fetchSprintsByProject,
  fetchBacklogItems,
  fetchProjectMembers,
  fetchSugerencias,
  fetchProjectEtiquetas,
} from '../services/backlog.service';
import type { BacklogMeta } from '../types/backlog.types';

const EMPTY: BacklogMeta = { statuses: [], priorities: [], types: [], sprints: [], items: [], users: [], sugerencias: [], etiquetas: [] };

export function useBacklogMeta(projectId: number | null | undefined) {
  const [meta,         setMeta]         = useState<BacklogMeta>(EMPTY);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    if (projectId == null) return;

    Promise.all([
      fetchBacklogStatuses(),
      fetchBacklogPriorities(),
      fetchBacklogTypes(),
      fetchSprintsByProject(projectId),
      fetchBacklogItems(projectId),
      fetchProjectMembers(),
      fetchSugerencias(projectId),
      fetchProjectEtiquetas(projectId),
    ])
      .then(([statuses, priorities, types, sprints, items, users, sugerencias, etiquetas]) => {
        setMeta({ statuses, priorities, types, sprints, items, users, sugerencias, etiquetas });
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [projectId, refreshCount]);

  return { meta, loading, error, refresh };
}
