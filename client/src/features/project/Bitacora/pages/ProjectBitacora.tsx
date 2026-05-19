import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDownIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { fetchSprintsByProject } from '@/features/project/Backlog/services/backlog.service';
import type { SprintRecord } from '@/features/project/Backlog/types/backlog.types';
import BitacoraCard from '../components/BitacoraCard';
import BitacoraReportPanel from '../components/BitacoraReportPanel';
import { useGenerateReport, useSprintBitacoras, useBitacoraDetail } from '../hooks/useBitacoraReport';
import styles from './ProjectBitacora.module.css';

const ProjectBitacora: React.FC = () => {
  const { id } = useParams();
  const PROJECT_ID = Number(id);

  const [sprints, setSprints]                 = useState<SprintRecord[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [selectedBitacoraId, setSelectedId]   = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { records, loading: listLoading, error: listError, load: loadList } = useSprintBitacoras(selectedSprintId ?? 0);
  const { generate, loading: generating, error: generateError }             = useGenerateReport();
  const { record: detail, loading: detailLoading, fetch: fetchDetail }      = useBitacoraDetail();

  useEffect(() => {
    fetchSprintsByProject(PROJECT_ID).then(data => {
      setSprints(data);
      if (data.length > 0) setSelectedSprintId(data[data.length - 1].id);
    });
  }, [PROJECT_ID]);

  useEffect(() => {
    if (selectedSprintId != null) loadList();
  }, [selectedSprintId, loadList]);

  useEffect(() => {
    if (selectedBitacoraId != null) fetchDetail(selectedBitacoraId);
  }, [selectedBitacoraId, fetchDetail]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  const handleGenerate = useCallback(async () => {
    if (!selectedSprintId) return;
    const result = await generate(selectedSprintId);
    if (result) {
      loadList();
      setSelectedId(result.id);
    }
  }, [selectedSprintId, generate, loadList]);

  const handleSelectSprint = (sprintId: number) => {
    setSelectedSprintId(sprintId);
    setSelectedId(null);
    setDropdownOpen(false);
  };

  const isLoading = listLoading || generating;

  return (
    <div className={styles.container}>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div ref={dropdownRef} className={styles.bubble}>
          <button
            type="button"
            className={`${styles.bubbleBtn} ${selectedSprint ? styles.bubbleBtnActive : ''}`}
            onClick={() => setDropdownOpen(o => !o)}
          >
            <span>{selectedSprint?.nombre ?? 'Seleccionar sprint'}</span>
            <ChevronDownIcon width={12} height={12} />
          </button>
          {dropdownOpen && (
            <div className={styles.bubbleMenu}>
              {sprints.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.sprintOption} ${s.id === selectedSprintId ? styles.sprintOptionActive : ''}`}
                  onClick={() => handleSelectSprint(s.id)}
                >
                  {s.nombre}
                </button>
              ))}
              {sprints.length === 0 && (
                <span className={styles.sprintEmpty}>Sin sprints</span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.generateBtn}
          disabled={!selectedSprintId || generating}
          onClick={handleGenerate}
        >
          <SparklesIcon width={16} height={16} />
          {generating ? 'Generando reporte...' : 'Generar Reporte IA'}
        </button>
      </div>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {generateError && (
        <div className={styles.errorBanner}>{generateError}</div>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className={styles.content}>

        {/* List column */}
        <div className={`${styles.list} ${selectedBitacoraId != null ? styles.listNarrow : ''}`}>
          {!selectedSprintId ? (
            <p className={styles.empty}>Selecciona un sprint para ver sus reportes.</p>
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : listError ? (
            <p className={styles.empty}>{listError}</p>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <SparklesIcon width={36} height={36} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Sin reportes todavía</p>
              <p className={styles.emptySub}>
                Genera tu primer reporte IA para este sprint con el botón de arriba.
              </p>
            </div>
          ) : (
            records.map(r => (
              <BitacoraCard
                key={r.id}
                record={r}
                isSelected={r.id === selectedBitacoraId}
                onClick={() => setSelectedId(prev => prev === r.id ? null : r.id)}
              />
            ))
          )}
        </div>

        {/* Report panel */}
        {selectedBitacoraId != null && (
          <div className={styles.panelWrapper}>
            <BitacoraReportPanel
              record={detail}
              loading={detailLoading}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function SkeletonCard() {
  return <div className={styles.skeletonCard} />;
}

export default ProjectBitacora;
