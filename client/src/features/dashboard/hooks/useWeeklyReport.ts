import { useState, useCallback } from 'react';
import { generateAndDownloadWeeklyReport } from '../services/weeklyReport.service';
import { useUser } from '@/core/auth/userContext';
import type { AdminDashboardData } from './useAdminDashboardData';

export type ReportState = 'idle' | 'loading' | 'error';

export function useWeeklyReport(data: AdminDashboardData | null) {
  const { user } = useUser();
  const [state, setState] = useState<ReportState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!data || !user) return;
    setState('loading');
    setErrorMsg(null);
    try {
      await generateAndDownloadWeeklyReport(data, user.id);
      setState('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, [data, user]);

  return { state, errorMsg, generate };
}
