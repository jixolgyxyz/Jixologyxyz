import { useCallback, useEffect, useState } from 'react';
import type { InvitacionPendienteRecord } from '../types/invitacion.types';
import { getPendingInvitations, acceptInvitation, denyInvitation } from '../services/invitacion.service';

export function useInvitaciones() {
  const [invitaciones, setInvitaciones] = useState<InvitacionPendienteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPendingInvitations();
      setInvitaciones(data);
    } catch {
      // silently swallow — invitations are non-critical if they fail to load
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  const removeFromList = (id: number) =>
    setInvitaciones(prev => prev.filter(i => i.id !== id));

  const withLoading = async (id: number, fn: () => Promise<void>) => {
    setLoadingIds(prev => [...prev, id]);
    try {
      await fn();
      removeFromList(id);
    } finally {
      setLoadingIds(prev => prev.filter(x => x !== id));
    }
  };

  const onAccept = (id: number) => withLoading(id, () => acceptInvitation(id));
  const onDeny   = (id: number) => withLoading(id, () => denyInvitation(id));

  return { invitaciones, isLoading, loadingIds, onAccept, onDeny, refetch: fetch };
}
