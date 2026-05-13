import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronDoubleUpIcon,
  ChevronUpIcon,
  MinusIcon,
  ChevronDoubleDownIcon,
} from '@heroicons/react/24/outline';
import FormPopUp from '@/shared/components/FormPopUp';
import styles from './CreateSprintForm.module.css';
import { useBacklogMeta } from '../../hooks/useBacklogMeta';
import { useCreateSprint } from '../../hooks/useCreateSprint'; //Aqui me quede
import { createSugerencia } from '../../services/backlog.service';
import { useUser } from '@/core/auth/userContext';
import type { BacklogStatusRecord, BacklogPriorityRecord, CreateBacklogItemPayload } from '../../types/backlog.types';


// ── Friendly error messages ───────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('id_tipo') && msg.includes('not-null'))
    return 'Debes seleccionar un tipo para el ítem.';
  if (msg.includes('id_estatus') && msg.includes('not-null'))
    return 'Debes seleccionar un estatus para el ítem.';
  if (msg.includes('nombre') && msg.includes('not-null'))
    return 'El nombre del ítem es obligatorio.';
  if (msg.includes('violates not-null constraint'))
    return 'Faltan campos obligatorios. Revisa el formulario e intenta de nuevo.';
  if (msg.includes('duplicate key') || msg.includes('unique constraint'))
    return 'Ya existe un ítem con esos datos. Cambia el nombre e intenta de nuevo.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Error de conexión. Comprueba tu internet e intenta de nuevo.';
  return 'Ocurrió un error al crear el ítem. Intenta de nuevo.';
}

// ── Hierarchy: which type can be parent of which ──────────────────
const PARENT_TYPE_NAME: Record<string, string> = {
  'Historia de Usuario': 'Épica',
  'Tarea':               'Historia de Usuario',
  'Subtarea':            'Tarea',
  'Bug':                 'Subtarea',
};

// ── Main form ─────────────────────────────────────────────────────
interface CreateBacklogItemFormProps {
  projectId: number;
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  id_tipo: string;
  id_estatus: string;
  id_prioridad: string;
  id_sprint: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  id_backlog_item_padre: string;
  id_usuario_responsable: string;
  complejidad: number | null;
}

const EMPTY_FORM: FormState = {
  nombre: '', descripcion: '', id_tipo: '', id_estatus: '',
  id_prioridad: '', id_sprint: '', fecha_inicio: '', fecha_vencimiento: '',
  id_backlog_item_padre: '', id_usuario_responsable: '', complejidad: null,
};

const CreateSprintForm: React.FC<CreateBacklogItemFormProps> = ({
  projectId, userId, isOpen, onClose, onCreated,
}) => {
  const { meta, loading: metaLoading } = useBacklogMeta(projectId);
  const { submit, loading: submitting, error } = useCreateSprint();
  const { user } = useUser();
  const isAdmin = (user?.idRolGlobal ?? 99) <= 2;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nombreTouched,  setNombreTouched]  = useState(false);
  const [estatusTouched, setEstatusTouched] = useState(false);
  const [tipoTouched,    setTipoTouched]    = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNombreTouched(true);
    setEstatusTouched(true);
    setTipoTouched(true);
    if (!form.nombre.trim() || !form.id_estatus || !form.id_tipo) return;
    const payload: CreateSprintPayload = {
      nombre:                 form.nombre.trim(),
      objetivo:            form.descripcion || null,
      id_tipo:                form.id_tipo                ? Number(form.id_tipo)                : null,
      id_estatus:             Number(form.id_estatus),
      id_prioridad:           form.id_prioridad           ? Number(form.id_prioridad)           : null,
      id_sprint:              form.id_sprint              ? Number(form.id_sprint)              : null,
      fecha_inicio:           form.fecha_inicio           || null,
      fecha_vencimiento:      form.fecha_vencimiento      || null,
      id_backlog_item_padre:  form.id_backlog_item_padre  ? Number(form.id_backlog_item_padre)  : null,
      id_usuario_responsable: form.id_usuario_responsable ? Number(form.id_usuario_responsable) : null,
      id_proyecto:            projectId,
      id_usuario_creador:     userId,
      complejidad:            form.complejidad,
    };
    try {
      const newItem = await submit(payload);
      if (!isAdmin && newItem?.id) {
        await createSugerencia(newItem.id);
      }
      onCreated?.();
      onClose();
    } catch { /* shown via error state */ }
  };

  return (
    <FormPopUp
      eyebrow="Backlog"
      title="Nuevo Sprint"
      subtitle="Crea un nuevo Sprint para una nueva fase de desarrollo."
      isOpen={isOpen}
      onClose={onClose}
    >
      {metaLoading ? (
        <p className={styles.loading}>Cargando opciones...</p>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Nombre */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nombre">
              Nombre <span className={styles.required}>*</span>
            </label>
            <input
              id="nombre" name="nombre" type="text"
              className={`${styles.input} ${nombreTouched && !form.nombre.trim() ? styles.inputError : ''}`}
              placeholder="Sprint 1"
              value={form.nombre}
              onChange={handleChange}
              onBlur={() => setNombreTouched(true)}
              required
            />
            {nombreTouched && !form.nombre.trim() && (
              <p className={styles.fieldError}>El nombre del ítem es obligatorio.</p>
            )}
          </div>

          {/* Descripción */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="descripcion">Objetivo</label>
            <textarea id="descripcion" name="descripcion" className={styles.textarea}
              placeholder="Metas que se buscan en el Sprint" rows={3} value={form.descripcion} onChange={handleChange} />
          </div>

          {/* Row: Fechas */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha inicio <span className={styles.required}>*</span></label>
              <input name="fecha_inicio" className={styles.input} type="date" value={form.fecha_inicio} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha vencimiento <span className={styles.required}>*</span></label>
              <input name="fecha_vencimiento" className={styles.input} type="date" value={form.fecha_vencimiento} onChange={handleChange} />
            </div>
          </div>

          {error && <p className={styles.error}>{friendlyError(error)}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn}
              disabled={submitting || !form.nombre.trim() || !form.fecha_inicio || !form.fecha_vencimiento}>
              {submitting ? 'Guardando...' : 'Crear ítem'}
            </button>
          </div>
        </form>
      )}
    </FormPopUp>
  );
};

export default CreateSprintForm;