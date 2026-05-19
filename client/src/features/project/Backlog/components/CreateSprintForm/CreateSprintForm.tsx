import React, { useEffect, useState } from 'react';
import FormPopUp from '@/shared/components/FormPopUp';
import styles from './CreateSprintForm.module.css';
import { useCreateSprint } from '../../hooks/useCreateSprint';
import { useUpdateSprint } from '../../hooks/useUpdateSprint';
import type { CreateSprintPayload, UpdateSprintPayload, SprintRecord } from '../../types/backlog.types';

// Store sprint dates at UTC noon so the calendar date is unambiguous in every timezone
function toUtcNoon(dateStr: string): string {
  return `${dateStr}T12:00:00.000Z`;
}

interface CreateSprintFormProps {
  projectId: number;
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  sprintToEdit?: SprintRecord;
  existingSprints?: SprintRecord[];
}

interface SprintFormState {
  nombre: string;
  objetivo: string;
  fecha_inicio: string;
  fecha_final: string;
}

const EMPTY_FORM: SprintFormState = {
  nombre: '',
  objetivo: '',
  fecha_inicio: '',
  fecha_final: '',
};

const SPRINT_DEFAULT_STATUS = 1;

function toFormDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

const CreateSprintForm: React.FC<CreateSprintFormProps> = ({
  projectId, userId, isOpen, onClose, onCreated, sprintToEdit, existingSprints = [],
}) => {
  const isEditMode = sprintToEdit != null;
  const { submit: create, loading: creating, error: createError } = useCreateSprint();
  const { submit: update, loading: updating, error: updateError } = useUpdateSprint();
  const submitting = creating || updating;
  const hookError  = createError ?? updateError;

  const [form, setForm] = useState<SprintFormState>(EMPTY_FORM);
  const [nombreTouched, setNombreTouched] = useState(false);
  const [nombreError,   setNombreError]   = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && sprintToEdit) {
        setForm({
          nombre:       sprintToEdit.nombre,
          objetivo:     sprintToEdit.objetivo ?? '',
          fecha_inicio: toFormDate(sprintToEdit.fecha_inicio),
          fecha_final:  toFormDate(sprintToEdit.fecha_final),
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setNombreTouched(false);
      setNombreError(null);
    }
  }, [isOpen, isEditMode, sprintToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'nombre') setNombreError(null);
  };

  const handleClose = () => {
    setNombreTouched(false);
    setNombreError(null);
    onClose();
  };

  const validateNombre = (nombre: string): string | null => {
    if (!nombre.trim()) return 'El nombre del sprint es obligatorio.';
    const duplicate = existingSprints.some(
      s => s.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
        && s.id !== sprintToEdit?.id,
    );
    if (duplicate) return 'Ya existe un sprint con ese nombre en este proyecto.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNombreTouched(true);

    const nameErr = validateNombre(form.nombre);
    if (nameErr) { setNombreError(nameErr); return; }
    if (!form.fecha_inicio || !form.fecha_final) return;

    try {
      if (isEditMode && sprintToEdit) {
        const payload: UpdateSprintPayload = {
          nombre:       form.nombre.trim(),
          objetivo:     form.objetivo || null,
          fecha_inicio: toUtcNoon(form.fecha_inicio),
          fecha_final:  toUtcNoon(form.fecha_final),
        };
        await update(sprintToEdit.id, payload);
      } else {
        const payload: CreateSprintPayload = {
          nombre:             form.nombre.trim(),
          objetivo:           form.objetivo || null,
          fecha_inicio:       toUtcNoon(form.fecha_inicio),
          fecha_final:        toUtcNoon(form.fecha_final),
          id_proyecto:        projectId,
          id_usuario_creador: userId,
          id_estatus:         SPRINT_DEFAULT_STATUS,
        };
        await create(payload);
      }
      onCreated?.();
      onClose();
    } catch { /* shown via hookError */ }
  };

  const nameValidationError = nombreTouched ? validateNombre(form.nombre) : null;

  return (
    <FormPopUp
      eyebrow="Backlog"
      title={isEditMode ? 'Editar Sprint' : 'Nuevo Sprint'}
      subtitle={
        isEditMode
          ? 'Modifica el nombre, objetivo o fechas del sprint.'
          : 'Crea un nuevo Sprint para una nueva fase de desarrollo.'
      }
      isOpen={isOpen}
      onClose={handleClose}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* Nombre */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sprint-nombre">
            Nombre <span className={styles.required}>*</span>
          </label>
          <input
            id="sprint-nombre"
            name="nombre"
            type="text"
            className={`${styles.input} ${nameValidationError ? styles.inputError : ''}`}
            placeholder="Sprint 1"
            value={form.nombre}
            onChange={handleChange}
            onBlur={() => setNombreTouched(true)}
            required
          />
          {nameValidationError && (
            <p className={styles.fieldError}>{nameValidationError}</p>
          )}
        </div>

        {/* Objetivo */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sprint-objetivo">Objetivo</label>
          <textarea
            id="sprint-objetivo"
            name="objetivo"
            className={styles.textarea}
            placeholder="Metas que se buscan en el Sprint"
            rows={3}
            value={form.objetivo}
            onChange={handleChange}
          />
        </div>

        {/* Fechas */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sprint-fecha-inicio">
              Fecha inicio <span className={styles.required}>*</span>
            </label>
            <input
              id="sprint-fecha-inicio"
              name="fecha_inicio"
              className={styles.input}
              type="date"
              value={form.fecha_inicio}
              onChange={handleChange}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sprint-fecha-final">
              Fecha final <span className={styles.required}>*</span>
            </label>
            <input
              id="sprint-fecha-final"
              name="fecha_final"
              className={styles.input}
              type="date"
              value={form.fecha_final}
              onChange={handleChange}
            />
          </div>
        </div>

        {hookError && <p className={styles.error}>{hookError}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !form.nombre.trim() || !form.fecha_inicio || !form.fecha_final}
          >
            {submitting ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear Sprint'}
          </button>
        </div>
      </form>
    </FormPopUp>
  );
};

export default CreateSprintForm;
