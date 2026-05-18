import React, { useEffect, useRef  } from 'react';
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
  bodyRef?: React.RefObject<HTMLDivElement | null>;
  closeOnOverlayClick?: boolean;
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
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Reset the "click started outside" flag whenever the window loses focus.
  // Without this, switching browser tabs can leave startedOutside=true, causing
  // the modal to close the moment the user clicks back into the window.
  useEffect(() => {
    if (!isOpen) return;
    const reset = () => { startedOutside.current = false; };
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const startedOutside = useRef(false);
  if (!isOpen) return null;

  return (
      <div className={styles.overlay}
        onMouseDown={(e) => {
          startedOutside.current = closeOnOverlayClick && e.target === e.currentTarget;
        }}
        onMouseUp={(e) => {
          if (startedOutside.current && e.target === e.currentTarget) {
            onClose();
          }
        }}
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
