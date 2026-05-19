import { useState } from 'react';
import { updateSprint } from '../services/backlog.service';
import type { UpdateSprintPayload } from '../types/backlog.types';

export function useUpdateSprint() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (id: number, payload: UpdateSprintPayload): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await updateSprint(id, payload);
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
