export type NotificationRecord = {
  id: number;
  nombre: string;
  descripcion: string | null;
  leida: boolean;
  fecha_lectura: string | null;
  fecha_envio: string;
  id_usuario: number;
};

export type NotificationTabFilter = 'all' | 'unread' | 'read';

export type NotificationUserContext = {
  idUsuario: number;
  authId: string;
  timeZone: string;
};

export type NotificationsState = {
  notifications: NotificationRecord[];
  userContext: NotificationUserContext | null;
  isLoading: boolean;
  error: string | null;
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