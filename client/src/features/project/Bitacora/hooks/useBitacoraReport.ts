import { useState, useCallback } from 'react';
import { useUser } from '@/core/auth/userContext';
import { generateSprintReport, fetchSprintBitacoras, fetchBitacoraById } from '../services/bitacora.service';
import type { BitacoraSprintRecord, BitacoraSprintSummary } from '../types/bitacora.types';

export function useGenerateReport() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const generate = useCallback(async (sprintId: number): Promise<BitacoraSprintRecord | null> => {
    if (!user) {
      setError('Debes iniciar sesión para generar un reporte');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      return await generateSprintReport(sprintId, user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { generate, loading, error };
}

export function useSprintBitacoras(sprintId: number) {
  const [records, setRecords] = useState<BitacoraSprintSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    try {
      setRecords(await fetchSprintBitacoras(sprintId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar bitácoras');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  return { records, loading, error, load };
}

export function useBitacoraDetail() {
  const [record, setRecord]   = useState<BitacoraSprintRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await fetchBitacoraById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, []);

  return { record, loading, error, fetch };
}
