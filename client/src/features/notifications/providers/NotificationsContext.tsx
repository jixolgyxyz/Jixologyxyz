import { createContext } from 'react';
import type { NotificationsContextValue } from '../types/notification.types';

export const NotificationsContext =
  createContext<NotificationsContextValue | undefined>(undefined);