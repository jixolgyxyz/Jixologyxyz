import { useState } from 'react';

export function useDashboardPanel(key: string) {
  const storageKey = `customizePanelOpen_${key}`;
  const [open, setOpen] = useState(() => sessionStorage.getItem(storageKey) === 'true');
  const openPanel  = () => { setOpen(true);  sessionStorage.setItem(storageKey, 'true'); };
  const closePanel = () => { setOpen(false); sessionStorage.removeItem(storageKey); };
  return { open, openPanel, closePanel };
}
