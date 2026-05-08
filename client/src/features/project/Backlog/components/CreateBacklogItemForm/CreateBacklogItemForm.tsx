import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronDoubleUpIcon,
  ChevronUpIcon,
  MinusIcon,
  ChevronDoubleDownIcon,
} from '@heroicons/react/24/outline';
import FormPopUp from '@/shared/components/FormPopUp';
import styles from './CreateBacklogItemForm.module.css';
import { useBacklogMeta } from '../../hooks/useBacklogMeta';
import { useCreateBacklogItem } from '../../hooks/useCreateBacklogItem';
import { createSugerencia } from '../../services/backlog.service';
import { useUser } from '@/core/auth/userContext';
import type { BacklogStatusRecord, BacklogPriorityRecord, CreateBacklogItemPayload } from '../../types/backlog.types';

// ── Status colour map by orden ────────────────────────────────────
const STATUS_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#F3F4F6', text: '#6B7280' },
  2: { bg: '#DBEAFE', text: '#1D4ED8' },
  3: { bg: '#FEF3C7', text: '#D97706' },
  4: { bg: '#D1FAE5', text: '#065F46' },
};

function statusStyle(s: BacklogStatusRecord) {
  return STATUS_COLORS[s.orden] ?? { bg: '#F3F4F6', text: '#6B7280' };
}

// ── Priority icon map by nombre ───────────────────────────────────
const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'Crítica': { icon: <ChevronDoubleUpIcon width={16} height={16} />, color: 'var(--color-mahindra-red)' },
  'Alta':    { icon: <ChevronUpIcon       width={16} height={16} />, color: '#f97316' },
  'Media':   { icon: <MinusIcon           width={16} height={16} />, color: 'var(--color-anchor-gray-1)' },
  'Baja':    { icon: <ChevronDownIcon     width={16} height={16} />, color: '#3b82f6' },
  'Mínima':  { icon: <ChevronDoubleDownIcon width={16} height={16} />, color: '#1d4ed8' },
};

function priorityConfig(p: BacklogPriorityRecord) {
  return PRIORITY_CONFIG[p.nombre] ?? { icon: <MinusIcon width={16} height={16} />, color: 'var(--color-anchor-gray-1)' };
}

// ── StatusPillSelect ──────────────────────────────────────────────
interface StatusPillSelectProps {
  statuses: BacklogStatusRecord[];
  value: string;
  onChange: (id: string) => void;
  onBlur?: () => void;
  required?: boolean;
  hasError?: boolean;
}

function StatusPillSelect({ statuses, value, onChange, onBlur, required, hasError }: StatusPillSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = statuses.find(s => String(s.id) === value);
  const { bg, text } = selected ? statusStyle(selected) : { bg: 'var(--color-clarity-gray-1)', text: 'var(--color-anchor-gray-1)' };

  return (
    <div className={styles.customSelect} ref={ref}>
      <button
        type="button"
        className={`${styles.pillTrigger} ${hasError ? styles.pillTriggerError : ''}`}
        style={{ backgroundColor: bg, color: text }}
        onClick={() => setOpen(o => !o)}
        onBlur={onBlur}
        aria-required={required}
      >
        <span>{selected ? selected.nombre : 'Seleccionar...'}</span>
        <ChevronDownIcon width={12} height={12} />
      </button>

      {open && (
        <div className={styles.pillDropdown}>
          {!required && (
            <button
              type="button"
              className={styles.pillOption}
              style={{ backgroundColor: 'var(--color-clarity-gray-1)', color: 'var(--color-anchor-gray-1)' }}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Sin estatus
            </button>
          )}
          {statuses.map(s => {
            const { bg: sBg, text: sText } = statusStyle(s);
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.pillOption} ${String(s.id) === value ? styles.pillOptionActive : ''}`}
                style={{ backgroundColor: sBg, color: sText }}
                onClick={() => { onChange(String(s.id)); setOpen(false); }}
              >
                {s.nombre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PriorityIconSelect ────────────────────────────────────────────
interface PriorityIconSelectProps {
  priorities: BacklogPriorityRecord[];
  value: string;
  onChange: (id: string) => void;
}

function PriorityIconSelect({ priorities, value, onChange }: PriorityIconSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = priorities.find(p => String(p.id) === value);
  const selConfig = selected ? priorityConfig(selected) : null;

  return (
    <div className={styles.customSelect} ref={ref}>
      <button
        type="button"
        className={styles.iconTrigger}
        onClick={() => setOpen(o => !o)}
        style={{ color: selConfig?.color ?? 'var(--color-anchor-gray-1)' }}
      >
        <span className={styles.iconTriggerIcon}>{selConfig?.icon ?? <MinusIcon width={16} height={16} />}</span>
        <span className={styles.iconTriggerLabel}>{selected ? selected.nombre : 'Sin prioridad'}</span>
        <ChevronDownIcon width={12} height={12} className={styles.iconTriggerChevron} />
      </button>

      {open && (
        <div className={styles.iconDropdown}>
          <button
            type="button"
            className={`${styles.iconOption} ${!value ? styles.iconOptionActive : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <MinusIcon width={16} height={16} style={{ color: 'var(--color-clarity-gray-2)' }} />
            <span>Sin prioridad</span>
          </button>
          {priorities.map(p => {
            const cfg = priorityConfig(p);
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.iconOption} ${String(p.id) === value ? styles.iconOptionActive : ''}`}
                onClick={() => { onChange(String(p.id)); setOpen(false); }}
              >
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span>{p.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

const CreateBacklogItemForm: React.FC<CreateBacklogItemFormProps> = ({
  projectId, userId, isOpen, onClose, onCreated,
}) => {
  const { meta, loading: metaLoading } = useBacklogMeta(projectId);
  const { submit, loading: submitting, error } = useCreateBacklogItem();
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
    const payload: CreateBacklogItemPayload = {
      nombre:                 form.nombre.trim(),
      descripcion:            form.descripcion || null,
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
      title="Nuevo ítem de backlog"
      subtitle="Completa los campos para agregar un nuevo ítem."
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
              placeholder="Nombre del ítem"
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
            <label className={styles.label} htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" className={styles.textarea}
              placeholder="Descripción opcional..." rows={3} value={form.descripcion} onChange={handleChange} />
          </div>

          {/* Row: Estatus + Prioridad */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                Estatus <span className={styles.required}>*</span>
              </label>
              <StatusPillSelect
                statuses={meta.statuses}
                value={form.id_estatus}
                onChange={v => { setEstatusTouched(true); setForm(f => ({ ...f, id_estatus: v })); }}
                onBlur={() => setEstatusTouched(true)}
                required
                hasError={estatusTouched && !form.id_estatus}
              />
              {estatusTouched && !form.id_estatus && (
                <p className={styles.fieldError}>Selecciona un estatus para continuar.</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Prioridad</label>
              <PriorityIconSelect
                priorities={meta.priorities}
                value={form.id_prioridad}
                onChange={v => setForm(f => ({ ...f, id_prioridad: v }))}
              />
            </div>
          </div>

          {/* Row: Sprint + Responsable */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Sprint</label>
              <select name="id_sprint" className={styles.select} value={form.id_sprint} onChange={handleChange}>
                <option value="">Sin sprint</option>
                {meta.sprints.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Responsable</label>
              <select name="id_usuario_responsable" className={styles.select} value={form.id_usuario_responsable} onChange={handleChange}>
                <option value="">Sin responsable</option>
                {meta.users.map(u => (
                  <option key={u.id} value={u.id}>
                    {[u.nombre, u.apellido].filter(Boolean).join(' ') || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Fechas */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha inicio</label>
              <input name="fecha_inicio" className={styles.input} type="date" value={form.fecha_inicio} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha vencimiento</label>
              <input name="fecha_vencimiento" className={styles.input} type="date" value={form.fecha_vencimiento} onChange={handleChange} />
            </div>
          </div>

          {/* Tipo — determines parent options, so placed before Ítem padre */}
          <div className={styles.field}>
            <label className={styles.label}>
              Tipo <span className={styles.required}>*</span>
            </label>
            <select
              name="id_tipo"
              className={`${styles.select} ${tipoTouched && !form.id_tipo ? styles.inputError : ''}`}
              value={form.id_tipo}
              onChange={e => {
                setTipoTouched(true);
                setForm(f => ({ ...f, id_tipo: e.target.value, id_backlog_item_padre: '' }));
              }}
              onBlur={() => setTipoTouched(true)}
            >
              <option value="">Seleccionar tipo...</option>
              {meta.types.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            {tipoTouched && !form.id_tipo && (
              <p className={styles.fieldError}>Selecciona un tipo para continuar.</p>
            )}
          </div>

          {/* Ítem padre — only shown when a type that can have a parent is selected */}
          {(() => {
            if (!form.id_tipo) return null;
            const selectedType = meta.types.find(t => String(t.id) === form.id_tipo);
            const parentTypeName = selectedType ? PARENT_TYPE_NAME[selectedType.nombre] : undefined;
            if (!parentTypeName) return null; // Épica has no parent
            const parentTypeId = meta.types.find(t => t.nombre === parentTypeName)?.id;
            const validParents = parentTypeId != null
              ? meta.items.filter(i => i.id_tipo === parentTypeId)
              : [];
            const PREFIX: Record<string, string> = { 'Historia de Usuario': 'HU', 'Tarea': 'TA', 'Bug': 'BG', 'Épica': 'EP', 'Subtarea': 'ST' };
            const parentPrefix = PREFIX[parentTypeName] ?? 'IT';
            return (
              <div className={styles.field}>
                <label className={styles.label}>Ítem padre <span className={styles.parentTypeHint}>({parentTypeName})</span></label>
                <select name="id_backlog_item_padre" className={styles.select} value={form.id_backlog_item_padre} onChange={handleChange}>
                  <option value="">Sin ítem padre</option>
                  {validParents.map(item => (
                    <option key={item.id} value={item.id}>
                      {parentPrefix}-{String(item.id).padStart(2, '0')} — {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* Complejidad */}
          <div className={styles.field}>
            <label className={styles.label}>Complejidad</label>
            <div className={styles.complexityRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.complexityBtn} ${form.complejidad === n ? styles.complexityBtnActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, complejidad: f.complejidad === n ? null : n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.error}>{friendlyError(error)}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn}
              disabled={submitting || !form.nombre.trim() || !form.id_estatus || !form.id_tipo}>
              {submitting ? 'Guardando...' : 'Crear ítem'}
            </button>
          </div>
        </form>
      )}
    </FormPopUp>
  );
};

export default CreateBacklogItemForm;
