import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchProjectMembersWithJornada,
  fetchProyectoFte,
  fetchCommittedHoursExcludingProject,
  buildFteData,
} from '../services/projectConfig.service';
import type { FteMemberRecord } from '../types/projectConfig.types';

export function useProjectFte(projectId: number) {
  const [fteData, setFteData] = useState<FteMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const loadedProjectRef = useRef<number | null>(null);

  useEffect(() => {
    if (loadedProjectRef.current !== projectId) setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect

    fetchProjectMembersWithJornada(projectId)
      .then(async members => {
        const memberIds = members.map(m => m.id);
        const [fteEntries, committedElsewhere] = await Promise.all([
          fetchProyectoFte(projectId),
          fetchCommittedHoursExcludingProject(memberIds, projectId),
        ]);
        setFteData(buildFteData(members, fteEntries, committedElsewhere));
        setError(null);
        loadedProjectRef.current = projectId;
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [projectId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  return { fteData, loading, error, refresh };
}
