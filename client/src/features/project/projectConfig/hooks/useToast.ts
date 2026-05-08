import { useCallback, useEffect, useState } from 'react';

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(t);
  }, [toast, durationMs]);

  const showError  = useCallback((message: string) => setToast(message), []);
  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showError, clearToast };
}
