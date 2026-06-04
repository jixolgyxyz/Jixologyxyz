import { supabase } from '@/core/supabase/supabase.client';

type SubscriptionRow = {
  id_usuario: number;
  id_backlog_item: number;
  fecha: string;
};

export type BacklogItemSubscriptionChange = {
  backlogItemId: number;
  userId: number;
  isSubscribed: boolean;
};

const SUBSCRIPTION_CHANGED_EVENT = 'backlog-item-subscription-changed';

export async function getBacklogItemSubscriptionStatus(
  backlogItemId: number,
  userId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('suscripcion_notificacion_backlog_item')
    .select('id_usuario')
    .eq('id_usuario', userId)
    .eq('id_backlog_item', backlogItemId)
    .maybeSingle<Pick<SubscriptionRow, 'id_usuario'>>();

  if (error) throw new Error(error.message);

  return data != null;
}

export async function subscribeToBacklogItem(
  backlogItemId: number,
  userId: number,
): Promise<void> {
  const { error } = await supabase
    .from('suscripcion_notificacion_backlog_item')
    .upsert(
      {
        id_usuario: userId,
        id_backlog_item: backlogItemId,
        fecha: new Date().toISOString(),
      },
      {
        onConflict: 'id_usuario,id_backlog_item',
        ignoreDuplicates: true,
      },
    );

  if (error) throw new Error(error.message);
}

export async function unsubscribeFromBacklogItem(
  backlogItemId: number,
  userId: number,
): Promise<void> {
  const { error } = await supabase
    .from('suscripcion_notificacion_backlog_item')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_backlog_item', backlogItemId);

  if (error) throw new Error(error.message);
}

export async function toggleBacklogItemSubscription(
  backlogItemId: number,
  userId: number,
): Promise<boolean> {
  const isSubscribed = await getBacklogItemSubscriptionStatus(backlogItemId, userId);

  if (isSubscribed) {
    await unsubscribeFromBacklogItem(backlogItemId, userId);
    return false;
  }

  await subscribeToBacklogItem(backlogItemId, userId);
  return true;
}

export function emitBacklogItemSubscriptionChange(
  detail: BacklogItemSubscriptionChange,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_CHANGED_EVENT, { detail }));
}

export function onBacklogItemSubscriptionChange(
  handler: (detail: BacklogItemSubscriptionChange) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    handler((event as CustomEvent<BacklogItemSubscriptionChange>).detail);
  };

  window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, listener);

  return () => window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, listener);
}
