import { useContext } from 'react';
import { NotificationsContext } from '../providers/NotificationsContext';

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error(
      'useNotifications debe usarse dentro de NotificationsProvider.',
    );
  }

  return context;
}