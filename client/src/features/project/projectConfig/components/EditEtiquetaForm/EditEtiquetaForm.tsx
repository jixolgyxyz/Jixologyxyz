import React, { useEffect, useState } from 'react';
import FormPopUp from '@/shared/components/FormPopUp';
import { updateEtiqueta } from '../../services/projectConfig.service';
import type { EtiquetaPersonalizadaRecord, UpdateEtiquetaPayload } from '../../types/projectConfig.types';
import styles from './EditEtiquetaForm.module.css';

interface EditEtiquetaFormProps {
  etiqueta: EtiquetaPersonalizadaRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onError: (message: string) => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  color_bloque: string;
  color_letra: string;
}

const EditEtiquetaForm: React.FC<EditEtiquetaFormProps> = ({
  etiqueta,
  isOpen,
  onClose,
  onUpdated,
  onError,
}) => {
  const [form, setForm] = useState<FormState>({
    nombre:       etiqueta.nombre,
    descripcion:  etiqueta.descripcion ?? '',
    color_bloque: etiqueta.color_bloque,
    color_letra:  etiqueta.color_letra,
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync form when etiqueta prop changes (different etiqueta opened)
  useEffect(() => {
    setForm({
      nombre:       etiqueta.nombre,
      descripcion:  etiqueta.descripcion ?? '',
      color_bloque: etiqueta.color_bloque,
      color_letra:  etiqueta.color_letra,
    });
  // Re-sync whenever any field of the etiqueta changes (including id when a different one opens)
  }, [etiqueta.id, etiqueta.nombre, etiqueta.descripcion, etiqueta.color_bloque, etiqueta.color_letra]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    const payload: UpdateEtiquetaPayload = {
      nombre:       form.nombre.trim(),
      descripcion:  form.descripcion.trim() || null,
      color_bloque: form.color_bloque,
      color_letra:  form.color_letra,
    };

    setSubmitting(true);
    try {
      await updateEtiqueta(etiqueta.id, payload);
      onUpdated?.();
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPopUp
      eyebrow="Etiquetas"
      title="Editar etiqueta"
      subtitle="Modifica el nombre, descripción o colores de la etiqueta."
      isOpen={isOpen}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-nombre">
            Nombre <span className={styles.required}>*</span>
          </label>
          <input
            id="edit-nombre"
            name="nombre"
            className={styles.input}
            type="text"
            placeholder="Nombre de la etiqueta"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-descripcion">Descripción</label>
          <textarea
            id="edit-descripcion"
            name="descripcion"
            className={styles.textarea}
            placeholder="Descripción opcional..."
            rows={2}
            value={form.descripcion}
            onChange={handleChange}
          />
        </div>

        <div className={styles.colorsRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-color_bloque">Color de fondo</label>
            <div className={styles.colorPickerWrapper}>
              <input
                id="edit-color_bloque"
                name="color_bloque"
                type="color"
                className={styles.colorInput}
                value={form.color_bloque}
                onChange={handleChange}
              />
              <span className={styles.colorHex}>{form.color_bloque}</span>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-color_letra">Color de texto</label>
            <div className={styles.colorPickerWrapper}>
              <input
                id="edit-color_letra"
                name="color_letra"
                type="color"
                className={styles.colorInput}
                value={form.color_letra}
                onChange={handleChange}
              />
              <span className={styles.colorHex}>{form.color_letra}</span>
            </div>
          </div>
        </div>

        <div className={styles.previewSection}>
          <span className={styles.previewLabel}>Vista previa</span>
          <div className={styles.previewArea}>
            <span
              className={styles.previewBadge}
              style={{ backgroundColor: form.color_bloque, color: form.color_letra }}
            >
              {form.nombre.trim() || 'Etiqueta'}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !form.nombre.trim()}
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </FormPopUp>
  );
};

export default EditEtiquetaForm;
