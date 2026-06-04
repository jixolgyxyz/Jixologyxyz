import { useState } from 'react';
import { createBacklogItem, createSuggestedBacklogItem } from '../services/backlog.service';
import type { CreateBacklogItemPayload, BacklogItemRecord } from '../types/backlog.types';

interface SubmitOptions {
  asSuggestion?: boolean;
}

export function useCreateBacklogItem() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (
    payload: CreateBacklogItemPayload,
    options: SubmitOptions = {},
  ): Promise<BacklogItemRecord> => {
    setLoading(true);
    setError(null);
    try {
      const item = options.asSuggestion
        ? await createSuggestedBacklogItem(payload)
        : await createBacklogItem(payload);
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
