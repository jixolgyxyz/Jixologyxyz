import Select from '@/shared/components/Select/Select';
import type { NotificationTypeCode, NotificationTypeFilter } from '../types/notification.types';
import { NOTIFICATION_TYPE_LABELS } from '../utils/notificationPresentation';
import { NOTIFICATION_TYPE_ICON_CONFIG } from './notificationTypeIconConfig';
import styles from './NotificationTypeFilter.module.css';

type Props = {
  value: NotificationTypeFilter;
  onChange: (value: NotificationTypeFilter) => void;
};

function typeIcon(code: NotificationTypeCode) {
  const cfg = NOTIFICATION_TYPE_ICON_CONFIG[code];
  return {
    icon: (
      <span style={{ width: 16, height: 16, display: 'flex', color: cfg.color }}>
        {cfg.icon}
      </span>
    ),
    color: cfg.color,
  };
}

const OPTIONS = [
  { value: 'all' as NotificationTypeFilter, label: 'Todas' },
  { value: 'sistema' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.sistema, ...typeIcon('sistema') },
  { value: 'invitacion_proyecto' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.invitacion_proyecto, ...typeIcon('invitacion_proyecto') },
  { value: 'sugerencia_creacion_backlog_item' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.sugerencia_creacion_backlog_item, ...typeIcon('sugerencia_creacion_backlog_item') },
  { value: 'cambio_proyecto' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.cambio_proyecto, ...typeIcon('cambio_proyecto') },
  { value: 'backlog_item_proximo_vencer' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.backlog_item_proximo_vencer, ...typeIcon('backlog_item_proximo_vencer') },
  { value: 'cambio_backlog_item' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.cambio_backlog_item, ...typeIcon('cambio_backlog_item') },
  { value: 'creacion_backlog_item' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.creacion_backlog_item, ...typeIcon('creacion_backlog_item') },
  { value: 'backlog_item_comment_created' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.backlog_item_comment_created, ...typeIcon('backlog_item_comment_created') },
  { value: 'sprint_proximo_vencer' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.sprint_proximo_vencer, ...typeIcon('sprint_proximo_vencer') },
  { value: 'backlog_item_en_revision' as NotificationTypeFilter, label: NOTIFICATION_TYPE_LABELS.backlog_item_en_revision, ...typeIcon('backlog_item_en_revision') },
];

export default function NotificationTypeFilter({ value, onChange }: Props) {
  return (
    <div className={styles.typeFilter}>
      <Select
        options={OPTIONS}
        value={value}
        onChange={(nextValue) => onChange(nextValue as NotificationTypeFilter)}
        placeholder="Tipo"
        required
        small
        searchable={false}
        className={styles.typeFilterSelect}
      />
    </div>
  );
}
