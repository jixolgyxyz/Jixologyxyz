import { useState } from 'react';
import { createBacklogItem } from '../services/backlog.service';
import type { CreateBacklogItemPayload, BacklogItemRecord } from '../types/backlog.types';

export function useCreateBacklogItem() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (payload: CreateBacklogItemPayload): Promise<BacklogItemRecord> => {
    setLoading(true);
    setError(null);
    try {
      const item = await createBacklogItem(payload);
      return item;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
