import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import type { BitacoraSprintSummary } from '../../types/bitacora.types';
import styles from './BitacoraCard.module.css';

interface BitacoraCardProps {
  record: BitacoraSprintSummary;
  isSelected: boolean;
  onClick: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const BitacoraCard: React.FC<BitacoraCardProps> = ({ record, isSelected, onClick }) => (
  <div
    className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
  >
    <span className={styles.icon}>
      <DocumentTextIcon width={18} height={18} />
    </span>
    <div className={styles.body}>
      <span className={styles.nombre}>{record.nombre}</span>
      <span className={styles.fecha}>{formatDate(record.fecha_creacion)}</span>
      {record.descripcion && (
        <span className={styles.descripcion}>{record.descripcion}</span>
      )}
    </div>
  </div>
);

export default BitacoraCard;
