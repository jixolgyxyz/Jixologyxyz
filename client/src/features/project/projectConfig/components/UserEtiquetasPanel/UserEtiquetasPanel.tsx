import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import {
  assignEtiquetaPersonalizada,
  removeEtiquetaPersonalizada,
  assignEtiquetaPredeterminada,
  removeEtiquetaPredeterminada,
} from '../../services/projectConfig.service';
import type {
  EtiquetaPersonalizadaRecord,
  EtiquetaPredeterminadaRecord,
  MemberEtiquetaRecord,
  MemberEtiquetaPredeterminadaRecord,
} from '../../types/projectConfig.types';
import styles from './UserEtiquetasPanel.module.css';

interface UserEtiquetasPanelProps {
  userId: number;
  projectId: number;
  userName: string;
  asignadorId: number;
  etiquetas: EtiquetaPersonalizadaRecord[];
  memberEtiquetas: MemberEtiquetaRecord[];
  etiquetasPredeterminadas: EtiquetaPredeterminadaRecord[];
  memberEtiquetasPred: MemberEtiquetaPredeterminadaRecord[];
  position: { x: number; y: number };
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

function toCustomSet(memberEtiquetas: MemberEtiquetaRecord[], userId: number): Set<number> {
  return new Set(
    memberEtiquetas
      .filter(me => me.id_usuario === userId)
      .map(me => me.id_etiqueta_proyecto_personalizada),
  );
}

function toPredSet(memberEtiquetasPred: MemberEtiquetaPredeterminadaRecord[], userId: number): Set<number> {
  return new Set(
    memberEtiquetasPred
      .filter(me => me.id_usuario === userId)
      .map(me => me.id_etiqueta_proyecto_predeterminada),
  );
}

const UserEtiquetasPanel: React.FC<UserEtiquetasPanelProps> = ({
  userId,
  projectId,
  userName,
  asignadorId,
  etiquetas,
  memberEtiquetas,
  etiquetasPredeterminadas,
  memberEtiquetasPred,
  position,
  onClose,
  onChanged,
  onError,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Optimistic local state — instant feedback on every toggle without waiting for server
  const [localCustomIds, setLocalCustomIds] = useState<Set<number>>(
    () => toCustomSet(memberEtiquetas, userId),
  );
  const [localPredIds, setLocalPredIds] = useState<Set<number>>(
    () => toPredSet(memberEtiquetasPred, userId),
  );

  // Sync with server state after background refresh
  useEffect(() => {
    setLocalCustomIds(toCustomSet(memberEtiquetas, userId));
  }, [memberEtiquetas, userId]);

  useEffect(() => {
    setLocalPredIds(toPredSet(memberEtiquetasPred, userId));
  }, [memberEtiquetasPred, userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleToggleCustom = async (etiqueta: EtiquetaPersonalizadaRecord) => {
    const wasAssigned = localCustomIds.has(etiqueta.id);

    setLocalCustomIds(prev => {
      const next = new Set(prev);
      if (wasAssigned) next.delete(etiqueta.id);
      else next.add(etiqueta.id);
      return next;
    });

    try {
      if (wasAssigned) {
        await removeEtiquetaPersonalizada(userId, etiqueta.id);
      } else {
        await assignEtiquetaPersonalizada(userId, etiqueta.id, asignadorId);
      }
      onChanged();
    } catch (err: unknown) {
      // Revert optimistic update on failure
      setLocalCustomIds(prev => {
        const next = new Set(prev);
        if (wasAssigned) next.add(etiqueta.id);
        else next.delete(etiqueta.id);
        return next;
      });
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTogglePred = async (etiqueta: EtiquetaPredeterminadaRecord) => {
    const wasAssigned = localPredIds.has(etiqueta.id);

    setLocalPredIds(prev => {
      const next = new Set(prev);
      if (wasAssigned) next.delete(etiqueta.id);
      else next.add(etiqueta.id);
      return next;
    });

    try {
      if (wasAssigned) {
        await removeEtiquetaPredeterminada(userId, etiqueta.id, projectId);
      } else {
        await assignEtiquetaPredeterminada(userId, etiqueta.id, projectId, asignadorId);
      }
      onChanged();
    } catch (err: unknown) {
      setLocalPredIds(prev => {
        const next = new Set(prev);
        if (wasAssigned) next.add(etiqueta.id);
        else next.delete(etiqueta.id);
        return next;
      });
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const hasAny = etiquetasPredeterminadas.length > 0 || etiquetas.length > 0;

  return (
    <div ref={ref} className={styles.panel} style={{ top: position.y, left: position.x }}>
      <p className={styles.heading}>Etiquetas de {userName}</p>

      {!hasAny ? (
        <p className={styles.empty}>No hay etiquetas disponibles.</p>
      ) : (
        <>
          {etiquetasPredeterminadas.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Generales</span>
              <ul className={styles.list}>
                {etiquetasPredeterminadas.map(et => {
                  const assigned = localPredIds.has(et.id);
                  return (
                    <li key={et.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${assigned ? styles.itemActive : ''}`}
                        onClick={() => handleTogglePred(et)}
                      >
                        <span
                          className={styles.badge}
                          style={{ backgroundColor: et.color_bloque, color: et.color_letra }}
                        >
                          {et.nombre}
                        </span>
                        <CheckIcon className={`${styles.checkIcon} ${assigned ? styles.checkIconVisible : ''}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {etiquetas.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Personalizadas</span>
              <ul className={styles.list}>
                {etiquetas.map(et => {
                  const assigned = localCustomIds.has(et.id);
                  return (
                    <li key={et.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${assigned ? styles.itemActive : ''}`}
                        onClick={() => handleToggleCustom(et)}
                      >
                        <span
                          className={styles.badge}
                          style={{ backgroundColor: et.color_bloque, color: et.color_letra }}
                        >
                          {et.nombre}
                        </span>
                        <CheckIcon className={`${styles.checkIcon} ${assigned ? styles.checkIconVisible : ''}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserEtiquetasPanel;
