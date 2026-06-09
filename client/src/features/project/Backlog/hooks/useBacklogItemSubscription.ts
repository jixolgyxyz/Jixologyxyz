import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/core/auth/userContext';
import {
  emitBacklogItemSubscriptionChange,
  getBacklogItemSubscriptionStatus,
  onBacklogItemSubscriptionChange,
  subscribeToBacklogItem,
  unsubscribeFromBacklogItem,
} from '../services/backlogItemSubscription.service';

function getSubscriptionErrorMessage(error: unknown, action: 'subscribe' | 'unsubscribe'): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/row-level security|permission|policy|violates/i.test(message)) {
    return 'No tienes permiso para suscribirte a este backlog item.';
  }

  return action === 'subscribe'
    ? 'No se pudo activar la suscripción.'
    : 'No se pudo desactivar la suscripción.';
}

export function useBacklogItemSubscription(backlogItemId: number | null | undefined) {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const canSubscribe = backlogItemId != null && userId != null;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(canSubscribe));
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async ({
    isActive = () => true,
    showLoading = true,
  }: {
    isActive?: () => boolean;
    showLoading?: boolean;
  } = {}) => {
    if (backlogItemId == null || userId == null) {
      if (isActive()) {
        setIsSubscribed(false);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    if (showLoading) setIsLoading(true);

    try {
      const next = await getBacklogItemSubscriptionStatus(backlogItemId, userId);
      if (!isActive()) return;
      setIsSubscribed(next);
      setError(null);
    } catch (err) {
      if (!isActive()) return;
      setError(getSubscriptionErrorMessage(err, 'subscribe'));
    } finally {
      if (showLoading && isActive()) setIsLoading(false);
    }
  }, [backlogItemId, userId]);

  useEffect(() => {
    let active = true;

    void loadStatus({ isActive: () => active });

    return () => {
      active = false;
    };
  }, [loadStatus]);

  useEffect(() => {
    return onBacklogItemSubscriptionChange((detail) => {
      if (detail.backlogItemId !== backlogItemId || detail.userId !== userId) return;
      setIsSubscribed(detail.isSubscribed);
      setError(null);
    });
  }, [backlogItemId, userId]);

  const refresh = useCallback(async () => {
    await loadStatus({ showLoading: false });
  }, [loadStatus]);

  const subscribe = useCallback(async () => {
    if (backlogItemId == null || userId == null || isToggling) return;

    const previous = isSubscribed;
    setIsToggling(true);
    setError(null);
    setIsSubscribed(true);

    try {
      await subscribeToBacklogItem(backlogItemId, userId);
      setIsSubscribed(true);
      emitBacklogItemSubscriptionChange({ backlogItemId, userId, isSubscribed: true });
    } catch (err) {
      setIsSubscribed(previous);
      setError(getSubscriptionErrorMessage(err, 'subscribe'));
    } finally {
      setIsToggling(false);
    }
  }, [backlogItemId, isSubscribed, isToggling, userId]);

  const unsubscribe = useCallback(async () => {
    if (backlogItemId == null || userId == null || isToggling) return;

    const previous = isSubscribed;
    setIsToggling(true);
    setError(null);
    setIsSubscribed(false);

    try {
      await unsubscribeFromBacklogItem(backlogItemId, userId);
      setIsSubscribed(false);
      emitBacklogItemSubscriptionChange({ backlogItemId, userId, isSubscribed: false });
    } catch (err) {
      setIsSubscribed(previous);
      setError(getSubscriptionErrorMessage(err, 'unsubscribe'));
    } finally {
      setIsToggling(false);
    }
  }, [backlogItemId, isSubscribed, isToggling, userId]);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
      return;
    }

    await subscribe();
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSubscribed,
    isLoading,
    isToggling,
    error,
    canSubscribe,
    refresh,
    subscribe,
    unsubscribe,
    toggle,
  };
}
