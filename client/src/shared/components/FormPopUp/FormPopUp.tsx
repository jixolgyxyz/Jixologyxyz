import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './FormPopUp.module.css';

export interface FormPopUpProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  bodyRef?: React.RefObject<HTMLDivElement>;
}

const FormPopUp: React.FC<FormPopUpProps> = ({
  title,
  eyebrow,
  subtitle,
  isOpen,
  onClose,
  children,
  wide,
  bodyRef,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${styles.modal}${wide ? ` ${styles.modalWide}` : ''}`} role="dialog" aria-modal="true">

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body} ref={bodyRef}>
          {children}
        </div>

      </div>
    </div>
  );
};

export default FormPopUp;
