import { useState } from 'react';
import { createSprint } from '../services/backlog.service';
import type { CreateSprintPayload } from '../types/backlog.types';

export function useCreateSprint() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (payload: CreateSprintPayload): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await createSprint(payload);
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
