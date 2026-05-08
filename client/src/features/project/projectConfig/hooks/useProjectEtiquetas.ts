import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProjectEtiquetas, fetchEtiquetasPredeterminadas } from '../services/projectConfig.service';
import type {
  EtiquetaPersonalizadaRecord,
  EtiquetaPredeterminadaRecord,
} from '../types/projectConfig.types';

export function useProjectEtiquetas(projectId: number) {
  const [etiquetas, setEtiquetas]                               = useState<EtiquetaPersonalizadaRecord[]>([]);
  const [etiquetasPredeterminadas, setEtiquetasPredeterminadas] =
    useState<EtiquetaPredeterminadaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const loadedProjectRef = useRef<number | null>(null);

  useEffect(() => {
    if (loadedProjectRef.current !== projectId) {
      setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    }

    Promise.all([
      fetchProjectEtiquetas(projectId),
      fetchEtiquetasPredeterminadas(),
    ])
      .then(([e, ep]) => {
        setEtiquetas(e);
        setEtiquetasPredeterminadas(ep);
        setError(null);
        loadedProjectRef.current = projectId;
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [projectId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  return { etiquetas, etiquetasPredeterminadas, loading, error, refresh };
}
