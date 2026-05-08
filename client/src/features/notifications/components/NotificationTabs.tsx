import Tabs from '@/shared/components/Tabs/Tabs';
import type { NotificationTabFilter } from '../types/notification.types';

type Props = {
  activeTab: NotificationTabFilter;
  totalCount: number;
  unreadCount: number;
  readCount: number;
  onChange: (tab: NotificationTabFilter) => void;
};

export default function NotificationTabs({ activeTab, totalCount, unreadCount, readCount, onChange }: Props) {
  return (
    <Tabs<NotificationTabFilter>
      activeValue={activeTab}
      onChange={onChange}
      items={[
        {
          value: 'all',
          label: 'Todas',
          count: totalCount,
        },
        {
          value: 'unread',
          label: 'No leídas',
          count: unreadCount,
        },
        {
          value: 'read',
          label: 'Leídas',
          count: readCount,
        },
      ]}
    />
  );
}