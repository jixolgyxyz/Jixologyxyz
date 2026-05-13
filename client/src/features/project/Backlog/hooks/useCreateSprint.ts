import { useState } from 'react';
import { createSprint } from '../services/backlog.service';
import type { createSprint, BacklogItemRecord } from '../types/backlog.types';

export function useCreateSprint() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (payload: createSprint): Promise<BacklogItemRecord> => {
    setLoading(true);
    setError(null);
    try {
      const item = await createSprint(payload);
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
