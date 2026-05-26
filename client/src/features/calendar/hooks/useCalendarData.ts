import { useEffect, useState } from 'react';
import { fetchCalendarData } from '../services/calendar.service';
import type { CalendarSprintRecord, CalendarProjectRecord } from '../types/calendar.types';

interface CalendarDataState {
  sprints: CalendarSprintRecord[];
  projects: CalendarProjectRecord[];
  loading: boolean;
  error: string | null;
}

export function useCalendarData(
  globalRole: number | null | undefined,
  userId: number | null | undefined,
): CalendarDataState {
  const [sprints, setSprints] = useState<CalendarSprintRecord[]>([]);
  const [projects, setProjects] = useState<CalendarProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (globalRole == null || userId == null) return;

    fetchCalendarData(globalRole, userId)
      .then(({ sprints: s, projects: p }) => {
        setSprints(s);
        setProjects(p);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [globalRole, userId]);

  return { sprints, projects, loading, error };
}
