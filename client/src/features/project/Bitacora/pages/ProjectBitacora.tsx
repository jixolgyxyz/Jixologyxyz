import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDownIcon, SparklesIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { fetchSprintsByProject } from '@/features/project/Backlog/services/backlog.service';
import type { SprintRecord } from '@/features/project/Backlog/types/backlog.types';
import BitacoraCard from '../components/BitacoraCard';
import BitacoraReportPanel from '../components/BitacoraReportPanel';
import { useGenerateReport, useSprintBitacoras, useBitacoraDetail } from '../hooks/useBitacoraReport';
import { fetchImpedimentosBySprint, fetchProyectoPresupuesto } from '../services/bitacora.service';
import type { ImpedimentoRecord, ProyectoPresupuestoInfo } from '../types/bitacora.types';
import styles from './ProjectBitacora.module.css';

const ProjectBitacora: React.FC = () => {
  const { id } = useParams();
  const PROJECT_ID = Number(id);

  const [sprints, setSprints]                   = useState<SprintRecord[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [selectedBitacoraId, setSelectedId]     = useState<number | null>(null);
  const [impedimentos, setImpedimentos]               = useState<ImpedimentoRecord[]>([]);
  const [impedimentosLoading, setImpedimentosLoading] = useState(false);
  const [presupuesto, setPresupuesto]                 = useState<ProyectoPresupuestoInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { records, loading: listLoading, error: listError, load: loadList } = useSprintBitacoras(selectedSprintId ?? 0);
  const { generate, loading: generating, error: generateError }             = useGenerateReport();
  const { record: detail, loading: detailLoading, fetch: fetchDetail }      = useBitacoraDetail();

  useEffect(() => {
    fetchSprintsByProject(PROJECT_ID).then(data => {
      setSprints(data);
      if (data.length > 0) setSelectedSprintId(data[data.length - 1].id);
    });
    fetchProyectoPresupuesto(PROJECT_ID).then(setPresupuesto).catch(() => null);
  }, [PROJECT_ID]);

  useEffect(() => {
    if (selectedSprintId != null) loadList();
  }, [selectedSprintId, loadList]);

  useEffect(() => {
    if (selectedSprintId == null) { setImpedimentos([]); return; }
    setImpedimentosLoading(true);
    fetchImpedimentosBySprint(selectedSprintId)
      .then(data => setImpedimentos(data))
      .catch(() => setImpedimentos([]))
      .finally(() => setImpedimentosLoading(false));
  }, [selectedSprintId]);

  useEffect(() => {
    if (selectedBitacoraId != null) fetchDetail(selectedBitacoraId);
  }, [selectedBitacoraId, fetchDetail]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);
  const isLoading = listLoading || generating;

  const handleGenerate = useCallback(async () => {
    if (!selectedSprintId) return;
    const result = await generate(selectedSprintId);
    if (result) { loadList(); setSelectedId(result.id); }
  }, [selectedSprintId, generate, loadList]);

  const handleSelectSprint = (sprintId: number) => {
    setSelectedSprintId(sprintId);
    setSelectedId(null);
    setDropdownOpen(false);
  };

  return (
    <div className={styles.container}>

      {/* ── Toolbar ── */}
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
              {sprints.length === 0 && <span className={styles.sprintEmpty}>Sin sprints</span>}
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

      {generateError && <div className={styles.errorBanner}>{generateError}</div>}

      {/* ── Three-column body ── */}
      <div className={styles.body}>

        {/* LEFT: Reports list */}
        <div className={styles.reportsCol}>
          <div className={styles.colHeader}>
            <DocumentTextIcon width={15} height={15} className={styles.colHeaderIcon} />
            <span className={styles.colHeaderTitle}>Reportes IA</span>
            {records.length > 0 && <span className={styles.colHeaderCount}>{records.length}</span>}
          </div>
          <div className={styles.reportsColList}>
            {!selectedSprintId ? (
              <p className={styles.colEmpty}>Selecciona un sprint.</p>
            ) : isLoading ? (
              Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
            ) : listError ? (
              <p className={styles.colEmpty}>{listError}</p>
            ) : records.length === 0 ? (
              <div className={styles.colEmptyState}>
                <SparklesIcon width={28} height={28} className={styles.colEmptyIcon} />
                <p className={styles.colEmptyTitle}>Sin reportes</p>
                <p className={styles.colEmptySub}>Usa el botón de arriba para generar el primer reporte IA.</p>
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
        </div>

        {/* CENTER: Report content */}
        <div className={`${styles.mainCol}${selectedBitacoraId == null ? ` ${styles.mainColEmpty}` : ''}`}>
          {selectedBitacoraId != null ? (
            <BitacoraReportPanel
              record={detail}
              loading={detailLoading}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className={styles.mainPlaceholder}>
              <DocumentTextIcon width={44} height={44} className={styles.placeholderIcon} />
              <p className={styles.placeholderTitle}>Selecciona un reporte</p>
              <p className={styles.placeholderSub}>
                Elige un reporte de la lista para leer su contenido completo aquí.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Impedimentos */}
        <div className={styles.impedimentosCol}>
          <div className={styles.colHeader}>
            <ExclamationTriangleIcon width={15} height={15} className={styles.impedimentosIcon} />
            <span className={styles.colHeaderTitle}>Impedimentos</span>
            <span className={`${styles.colHeaderCount} ${styles.colHeaderCountAmber}`}>{impedimentos.length}</span>
          </div>

          <div className={styles.impedimentosColBody}>
            {impedimentosLoading ? (
              <div className={styles.impedimentosSkeleton} />
            ) : impedimentos.length === 0 ? (
              <p className={styles.colEmpty}>Sin impedimentos para este sprint.</p>
            ) : (
              <>
                <div className={styles.impedimentosList}>
                  {impedimentos.map(imp => (
                    <div key={imp.id} className={`${styles.impedimentoCard}${imp.resuelto ? ` ${styles.impedimentoCardResuelto}` : ''}`}>
                      <div className={styles.impedimentoLeft}>
                        <div className={styles.impedimentoIconWrapper}>
                          <ExclamationTriangleIcon width={14} height={14} className={styles.impedimentoIcon} />
                        </div>
                      </div>
                      <div className={styles.impedimentoBody}>
                        <div className={styles.impedimentoTitleRow}>
                          <span className={styles.impedimentoNombre}>{imp.nombre}</span>
                          {imp.costo != null && (
                            <span className={styles.impedimentoCostoChip}>
                              {presupuesto?.abreviatura ?? ''} {imp.costo.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {imp.descripcion && <p className={styles.impedimentoDesc}>{imp.descripcion}</p>}
                        <div className={styles.impedimentoMeta}>
                          <div className={styles.impedimentoItemRef}>
                            <span className={styles.impedimentoItemLabel}>Ítem:</span>
                            <span className={styles.impedimentoItemName}>#{imp.backlog_item?.id} — {imp.backlog_item?.nombre ?? 'Desconocido'}</span>
                          </div>
                          {imp.resuelto && <span className={styles.impedimentoResueltoChip}>✓ Resuelto</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Budget impact */}
                {presupuesto?.costo_mensual != null && presupuesto.tolerancia_desviacion != null && (() => {
                  const tolerancia  = presupuesto.costo_mensual! * (presupuesto.tolerancia_desviacion! / 100);
                  const activeCost  = impedimentos.filter(i => !i.resuelto && i.costo != null).reduce((s, i) => s + (i.costo ?? 0), 0);
                  const pct         = tolerancia > 0 ? Math.min(100, (activeCost / tolerancia) * 100) : 0;
                  const cur         = presupuesto.abreviatura ?? '';
                  const isOver      = activeCost > tolerancia;
                  return activeCost > 0 ? (
                    <div className={styles.budgetImpact}>
                      <span className={styles.budgetImpactTitle}>Desviación vs. tolerancia</span>
                      <div className={styles.budgetBar}>
                        <div className={styles.budgetBarFill} style={{ width: `${pct}%`, background: isOver ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#22c55e' }} />
                      </div>
                      <div className={styles.budgetImpactRow}>
                        <span className={styles.budgetImpactLabel}>Costo de impedimentos activos</span>
                        <span className={styles.budgetImpactValue}>{cur} {activeCost.toLocaleString()}</span>
                      </div>
                      <div className={styles.budgetImpactRow}>
                        <span className={styles.budgetImpactLabel}>Tolerancia permitida ({presupuesto.tolerancia_desviacion}% de costo mensual)</span>
                        <span className={styles.budgetImpactValue}>{cur} {tolerancia.toLocaleString()}</span>
                      </div>
                      <div className={styles.budgetImpactRow}>
                        <span className={styles.budgetImpactLabel}>Desviación utilizada</span>
                        <span className={`${styles.budgetImpactValue} ${isOver ? styles.budgetImpactValueDanger : pct >= 75 ? styles.budgetImpactValueWarn : ''}`}>
                          {pct.toFixed(1)}%{isOver ? ' ⚠ Excedida' : ''}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

function SkeletonCard() {
  return <div className={styles.skeletonCard} />;
}

export default ProjectBitacora;
