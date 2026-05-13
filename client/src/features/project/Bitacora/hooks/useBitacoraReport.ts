import { useState, useCallback } from 'react';
import { generateSprintReport, fetchSprintBitacoras, fetchBitacoraById } from '../services/bitacora.service';
import type { BitacoraSprintRecord, BitacoraSprintSummary } from '../types/bitacora.types';

export function useGenerateReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (sprintId: number): Promise<BitacoraSprintRecord | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSprintReport(sprintId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

export function useSprintBitacoras(sprintId: number) {
  const [records, setRecords] = useState<BitacoraSprintSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSprintBitacoras(sprintId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar bitácoras');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  return { records, loading, error, load };
}

export function useBitacoraDetail() {
  const [record, setRecord] = useState<BitacoraSprintRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBitacoraById(id);
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, []);

  return { record, loading, error, fetch };
}
