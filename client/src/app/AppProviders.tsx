import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from '@/core/auth/userContext';
import { NotificationsProvider } from '@/features/notifications/providers/NotificationsProvider';

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <BrowserRouter>
      <UserProvider>
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </UserProvider>
    </BrowserRouter>
  );
}