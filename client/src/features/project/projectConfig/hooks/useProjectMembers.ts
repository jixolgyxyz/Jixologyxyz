import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchProjectMembers,
  fetchMemberEtiquetasPersonalizadas,
  fetchMemberEtiquetasPredeterminadas,
} from '../services/projectConfig.service';
import type {
  ProjectMemberRecord,
  MemberEtiquetaRecord,
  MemberEtiquetaPredeterminadaRecord,
} from '../types/projectConfig.types';

export function useProjectMembers(projectId: number) {
  const [members, setMembers]                         = useState<ProjectMemberRecord[]>([]);
  const [memberEtiquetas, setMemberEtiquetas]         = useState<MemberEtiquetaRecord[]>([]);
  const [memberEtiquetasPred, setMemberEtiquetasPred] =
    useState<MemberEtiquetaPredeterminadaRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Only show loading skeleton when the project changes, not on background refreshes.
  const loadedProjectRef = useRef<number | null>(null);

  useEffect(() => {
    if (loadedProjectRef.current !== projectId) {
      setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    }

    Promise.all([
      fetchProjectMembers(projectId),
      fetchMemberEtiquetasPersonalizadas(projectId),
      fetchMemberEtiquetasPredeterminadas(projectId),
    ])
      .then(([m, me, mep]) => {
        setMembers(m);
        setMemberEtiquetas(me);
        setMemberEtiquetasPred(mep);
        setError(null);
        loadedProjectRef.current = projectId;
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [projectId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  return { members, memberEtiquetas, memberEtiquetasPred, loading, error, refresh };
}
