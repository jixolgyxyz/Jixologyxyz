import DebugApp from './DebugApp';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/AppProviders';

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <DebugApp />
  </AppProviders>
);