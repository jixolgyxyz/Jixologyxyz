import React from 'react';
import ReactMarkdown from 'react-markdown';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { BitacoraSprintRecord } from '../../types/bitacora.types';
import styles from './BitacoraReportPanel.module.css';

interface BitacoraReportPanelProps {
  record: BitacoraSprintRecord | null;
  loading: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const BitacoraReportPanel: React.FC<BitacoraReportPanelProps> = ({ record, loading, onClose }) => (
  <div className={styles.panel}>
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>
        {loading ? (
          <div className={styles.skeletonTitle} />
        ) : (
          <>
            <span className={styles.nombre}>{record?.nombre ?? ''}</span>
            {record && (
              <span className={styles.fecha}>{formatDate(record.fecha_creacion)}</span>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        title="Cerrar"
        onClick={onClose}
      >
        <XMarkIcon width={18} height={18} />
      </button>
    </div>

    <div className={styles.panelBody}>
      {loading ? (
        <div className={styles.skeletonBody}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={styles.skeletonLine}
              style={{ width: `${60 + (i % 3) * 15}%` }}
            />
          ))}
        </div>
      ) : record?.reporte_ia ? (
        <div className={styles.markdown}>
          <ReactMarkdown>{record.reporte_ia}</ReactMarkdown>
        </div>
      ) : (
        <p className={styles.noContent}>Este reporte no tiene contenido generado.</p>
      )}
    </div>
  </div>
);

export default BitacoraReportPanel;
