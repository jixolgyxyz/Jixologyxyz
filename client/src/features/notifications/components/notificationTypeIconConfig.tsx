import type { ReactElement } from 'react';
import type { NotificationTypeCode } from '../types/notification.types';

export const NOTIFICATION_TYPE_ICON_CONFIG: Record<
  NotificationTypeCode,
  { bg: string; color: string; icon: ReactElement }
> = {
  sistema: {
    bg: '#e8eaf6',
    color: '#3949ab',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  invitacion_proyecto: {
    bg: '#e8f5e9',
    color: '#2e7d32',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="9.5" y1="10.5" x2="14.5" y2="10.5" />
      </svg>
    ),
  },
  sugerencia_creacion_backlog_item: {
    bg: '#fffde7',
    color: '#f57f17',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z" />
      </svg>
    ),
  },
  cambio_proyecto: {
    bg: '#e3f2fd',
    color: '#1565c0',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        <polyline points="16 10 12 14 8 10" />
        <line x1="12" y1="3" x2="12" y2="14" />
      </svg>
    ),
  },
  backlog_item_proximo_vencer: {
    bg: '#fff3e0',
    color: '#e65100',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <line x1="12" y1="17" x2="12" y2="17.5" strokeWidth="2.5" />
      </svg>
    ),
  },
  cambio_backlog_item: {
    bg: '#f3e5f5',
    color: '#6a1b9a',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M10 13l1.5 1.5L15 11" />
      </svg>
    ),
  },
  creacion_backlog_item: {
    bg: '#e0f7fa',
    color: '#00695c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
  },
  backlog_item_comment_created: {
    bg: '#ede7f6',
    color: '#5e35b1',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 8h8" />
        <path d="M8 12h5" />
      </svg>
    ),
  },
  sprint_proximo_vencer: {
    bg: '#fce4ec',
    color: '#b71c1c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
};
