import { useState } from 'react';
import { createSprint } from '../services/backlog.service';
import type { CreateSprintPayload, SprintRecord } from '../types/backlog.types';

export function useCreateSprint() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (payload: CreateSprintPayload): Promise<SprintRecord> => {
    setLoading(true);
    setError(null);
    try {
      const sprint = await createSprint(payload);
      return sprint;
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
