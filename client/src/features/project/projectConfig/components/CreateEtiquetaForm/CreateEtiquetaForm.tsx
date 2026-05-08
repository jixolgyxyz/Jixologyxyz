import React, { useState } from 'react';
import FormPopUp from '@/shared/components/FormPopUp';
import { createEtiqueta } from '../../services/projectConfig.service';
import type { CreateEtiquetaPayload } from '../../types/projectConfig.types';
import styles from './CreateEtiquetaForm.module.css';

interface CreateEtiquetaFormProps {
  projectId: number;
  creadorId: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onError: (message: string) => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  color_bloque: string;
  color_letra: string;
}

const EMPTY_FORM: FormState = {
  nombre: '',
  descripcion: '',
  color_bloque: '#1f3650',
  color_letra: '#ffffff',
};

const CreateEtiquetaForm: React.FC<CreateEtiquetaFormProps> = ({
  projectId,
  creadorId,
  isOpen,
  onClose,
  onCreated,
  onError,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    const payload: CreateEtiquetaPayload = {
      nombre:       form.nombre.trim(),
      descripcion:  form.descripcion.trim() || null,
      color_bloque: form.color_bloque,
      color_letra:  form.color_letra,
      id_proyecto:  projectId,
      id_creador:   creadorId,
    };

    setSubmitting(true);
    try {
      await createEtiqueta(payload);
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPopUp
      eyebrow="Configuración"
      title="Nueva etiqueta"
      subtitle="Crea una etiqueta personalizada para este proyecto."
      isOpen={isOpen}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* Nombre */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nombre">
            Nombre <span className={styles.required}>*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            className={styles.input}
            type="text"
            placeholder="Ej: Frontend, QA, Diseño..."
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        {/* Descripción */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            className={styles.textarea}
            placeholder="Descripción opcional de la etiqueta..."
            rows={2}
            value={form.descripcion}
            onChange={handleChange}
          />
        </div>

        {/* Color pickers */}
        <div className={styles.colorsRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="color_bloque">Color de fondo</label>
            <div className={styles.colorPickerWrapper}>
              <input
                id="color_bloque"
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
            <label className={styles.label} htmlFor="color_letra">Color de texto</label>
            <div className={styles.colorPickerWrapper}>
              <input
                id="color_letra"
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

        {/* Live preview */}
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
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !form.nombre.trim()}
          >
            {submitting ? 'Guardando...' : 'Crear etiqueta'}
          </button>
        </div>
      </form>
    </FormPopUp>
  );
};

export default CreateEtiquetaForm;
