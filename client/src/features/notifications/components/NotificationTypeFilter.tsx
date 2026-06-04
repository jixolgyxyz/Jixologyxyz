import Select from '@/shared/components/Select/Select';
import type { NotificationTypeFilter } from '../types/notification.types';
import { NOTIFICATION_TYPE_LABELS } from '../utils/notificationPresentation';
import styles from './NotificationTypeFilter.module.css';

type Props = {
  value: NotificationTypeFilter;
  onChange: (value: NotificationTypeFilter) => void;
};

const OPTIONS: { value: NotificationTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'sistema', label: NOTIFICATION_TYPE_LABELS.sistema },
  { value: 'invitacion_proyecto', label: NOTIFICATION_TYPE_LABELS.invitacion_proyecto },
  {
    value: 'sugerencia_creacion_backlog_item',
    label: NOTIFICATION_TYPE_LABELS.sugerencia_creacion_backlog_item,
  },
  { value: 'cambio_proyecto', label: NOTIFICATION_TYPE_LABELS.cambio_proyecto },
  {
    value: 'backlog_item_proximo_vencer',
    label: NOTIFICATION_TYPE_LABELS.backlog_item_proximo_vencer,
  },
  { value: 'cambio_backlog_item', label: NOTIFICATION_TYPE_LABELS.cambio_backlog_item },
  {
    value: 'creacion_backlog_item',
    label: NOTIFICATION_TYPE_LABELS.creacion_backlog_item,
  },
  { value: 'sprint_proximo_vencer', label: NOTIFICATION_TYPE_LABELS.sprint_proximo_vencer },
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
