import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/shared/components/LoadingState/LoadingState';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import ViewItemDetail from '@/shared/components/ViewNotiDetail/ViewItemDetail';
import type {
  BacklogItemRecord,
  BacklogMeta,
} from '@/features/project/Backlog/types/backlog.types';
import type { NotificationRecord } from '../types/notification.types';
import {
  acceptBacklogItemSuggestion,
  rejectBacklogItemSuggestion,
} from '../services/notificationsService';
import {
  getBacklogItemForNotification,
  getBacklogMetaForNotificationProject,
} from '../services/notificationBacklogDetailService';
import {
  getNotificationBacklogItemId,
  getNotificationProjectPath,
} from '../utils/notificationPresentation';

type Props = {
  notification: NotificationRecord;
  isSuggestion?: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onAfterAction: () => Promise<void>;
};

export default function BacklogItemNotificationDetail({
  notification,
  isSuggestion = false,
  onClose,
  onNavigate,
  onAfterAction,
}: Props) {
  const itemId = useMemo(
    () => getNotificationBacklogItemId(notification),
    [notification],
  );

  const [item, setItem] = useState<BacklogItemRecord | null>(null);
  const [meta, setMeta] = useState<BacklogMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetail = useCallback(async ({
    showLoading = true,
    isActive = () => true,
  }: {
    showLoading?: boolean;
    isActive?: () => boolean;
  } = {}) => {
    if (!itemId) {
      if (isActive()) {
        setItem(null);
        setMeta(null);
        if (showLoading) setIsLoading(false);
      }
      return;
    }

    if (showLoading) setIsLoading(true);
    setActionError(null);

    try {
      const loadedItem = await getBacklogItemForNotification(itemId);

      if (!isActive()) return;

      if (!loadedItem) {
        setItem(null);
        setMeta(null);
        return;
      }

      const loadedMeta = await getBacklogMetaForNotificationProject(
        loadedItem.id_proyecto,
      );

      if (!isActive()) return;

      setItem(loadedItem);
      setMeta(loadedMeta);
    } catch (error) {
      if (!isActive()) return;
      setActionError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el backlog item.',
      );
    } finally {
      if (showLoading && isActive()) setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    let isActive = true;

    void loadDetail({ isActive: () => isActive });

    return () => {
      isActive = false;
    };
  }, [loadDetail]);

  const handleNavigateProject = () => {
    const path = getNotificationProjectPath(notification);
    if (path) onNavigate(path);
  };

  const handleUpdated = async () => {
    await onAfterAction();
    await loadDetail({ showLoading: false });
  };

  const handleAcceptSuggestion = async () => {
    setActionError(null);

    try {
      await acceptBacklogItemSuggestion(notification.id);
    } catch {
      throw new Error('No se pudo aceptar la sugerencia.');
    }

    try {
      await onAfterAction();
    } finally {
      onClose();
    }
  };

  const handleRejectSuggestion = async () => {
    setActionError(null);

    try {
      await rejectBacklogItemSuggestion(notification.id);
    } catch {
      throw new Error('No se pudo rechazar la sugerencia.');
    }

    try {
      await onAfterAction();
    } finally {
      onClose();
    }
  };

  if (isLoading) return <LoadingState />;

  if (actionError) {
    return (
      <ErrorState
        title="No se pudo cargar el detalle"
        message={actionError}
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!item || !meta) {
    return (
      <ErrorState
        title="Backlog item no disponible"
        message="El backlog item pudo haber sido eliminado o aceptado."
      />
    );
  }

  const suggestionRecord = meta.sugerencias.find(s => s.id === item.id);
  const canRespondSuggestion = isSuggestion && !!suggestionRecord && !suggestionRecord.aceptada;

  return (
    <ViewItemDetail
      item={item}
      meta={meta}
      isSuggestion={canRespondSuggestion}
      readOnly={!canRespondSuggestion}
      onClose={onClose}
      onUpdated={handleUpdated}
      onNavigate={(nextItem) => setItem(nextItem)}
      onNavigateToProject={handleNavigateProject}
      onAcceptSuggestion={canRespondSuggestion ? handleAcceptSuggestion : undefined}
      onRejectSuggestion={canRespondSuggestion ? handleRejectSuggestion : undefined}
      initialEditing={false}
      focusCommentId={notification.id_comentario}
    />
  );
}
