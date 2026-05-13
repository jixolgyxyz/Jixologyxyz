import React from 'react';
import ReactMarkdown from 'react-markdown';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
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

function downloadMarkdown(nombre: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre.replace(/\s+/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
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
      <div className={styles.panelActions}>
        {record?.reporte_ia && (
          <button
            type="button"
            className={styles.actionBtn}
            title="Descargar Markdown"
            onClick={() => downloadMarkdown(record.nombre, record.reporte_ia!)}
          >
            <ArrowDownTrayIcon width={16} height={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.closeBtn}
          title="Cerrar"
          onClick={onClose}
        >
          <XMarkIcon width={18} height={18} />
        </button>
      </div>
    </div>

    <div className={styles.panelBody}>
      {loading ? (
        <div className={styles.skeletonBody}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${60 + (i % 3) * 15}%` }} />
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
