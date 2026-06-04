export type NotificationTypeCode =
  | 'sistema'
  | 'invitacion_proyecto'
  | 'sugerencia_creacion_backlog_item'
  | 'cambio_proyecto'
  | 'backlog_item_proximo_vencer'
  | 'cambio_backlog_item'
  | 'creacion_backlog_item'
  | 'sprint_proximo_vencer';

export type NotificationTabFilter = 'all' | 'unread' | 'read';

export type NotificationTypeFilter = 'all' | NotificationTypeCode;

export type NotificationRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'subscribed'
  | 'reconnecting'
  | 'error'
  | 'disabled';

export type NotificationRecord = {
  id: number;
  nombre: string;
  descripcion: string | null;
  leida: boolean;
  fecha_lectura: string | null;
  fecha_envio: string;
  id_usuario: number;

  id_tipo_notificacion: number;
  tipo_codigo: NotificationTypeCode;
  tipo_nombre: string;

  id_invitacion_proyecto: number | null;
  invitacion_aceptada: boolean | null;

  id_proyecto_destino: number | null;
  id_proyecto_cambio: number | null;
  nombre_proyecto: string | null;
  seccion_destino_codigo: string | null;
  seccion_destino_ruta: string | null;
  id_usuario_actor_proyecto: number | null;

  id_backlog_item: number | null;
  nombre_backlog_item: string | null;

  id_backlog_item_sugerido: number | null;
  id_backlog_item_cambio: number | null;
  id_backlog_item_creacion: number | null;
  id_backlog_item_por_vencer: number | null;

  id_sprint: number | null;
  nombre_sprint: string | null;
  id_sprint_por_vencer: number | null;

  fecha_vencimiento_notificada: string | null;
  fecha_final_notificada: string | null;
};

export type NotificationUserContext = {
  idUsuario: number;
  authId: string;
  timeZone: string;
};

export type NotificationsState = {
  notifications: NotificationRecord[];
  userContext: NotificationUserContext | null;
  isLoading: boolean;
  hasLoadedInitialData: boolean;
  error: string | null;
  realtimeError: string | null;
  realtimeStatus: NotificationRealtimeStatus;
};

export type NotificationsContextValue = NotificationsState & {
  unreadCount: number;
  readCount: number;
  refetch: () => Promise<void>;
  getNotificationById: (id: number) => NotificationRecord | undefined;
  loadNotificationById: (id: number) => Promise<NotificationRecord | null>;
  markAsRead: (id: number) => Promise<void>;
  markAsUnread: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
};
