import { useCallback, useEffect, useState } from 'react';
import { fetchBacklogItems } from '../services/backlog.service';
import type { BacklogItemRecord } from '../types/backlog.types';

export function useBacklogItems(projectId: number | null | undefined) {
  const [items,   setItems]   = useState<BacklogItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    fetchBacklogItems(projectId ?? undefined)
      .then(data => { setItems(data); setError(null); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [projectId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  return { items, loading, error, refresh };
}
