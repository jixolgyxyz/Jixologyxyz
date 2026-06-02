import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronDoubleUpIcon,
  ChevronUpIcon,
  MinusIcon,
  ChevronDoubleDownIcon,
  BugAntIcon,
  BookOpenIcon,
  BoltIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import FormPopUp from '@/shared/components/FormPopUp';
import { DatePicker } from '@/shared/components/DatePicker/DatePicker';
import { Select } from '@/shared/components/Select/Select';
import styles from './CreateBacklogItemForm.module.css';
import { useCreateBacklogItem } from '../../hooks/useCreateBacklogItem';
import { createSugerencia, addBacklogItemBlock } from '../../services/backlog.service';
import type { BacklogStatusRecord, BacklogPriorityRecord, CreateBacklogItemPayload, BacklogMeta, BacklogItemRecord, BacklogTypeRecord } from '../../types/backlog.types';

// ── Type prefix map ───────────────────────────────────────────────
const TYPE_PREFIX: Record<string, string> = {
  'Historia de Usuario': 'HU',
  'Tarea':               'TA',
  'Bug':                 'BG',
  'Épica':               'EP',
  'Subtarea':            'ST',
};

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


// ── Type icons ────────────────────────────────────────────────────
function TaskIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 8L7.5 10.5L11 5.5" />
    </svg>
  );
}
function SubtaskIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1.5" y1="0.5" x2="1.5" y2="12.5" />
      <line x1="1.5" y1="4" x2="5" y2="4" />
      <line x1="1.5" y1="12.5" x2="5" y2="12.5" />
      <rect x="5" y="1" width="6" height="6" />
      <path d="M6.5 4L7.5 6.5L11.5 1.5" />
      <rect x="5" y="9.5" width="6" height="6" />
      <path d="M6.5 12.5L7.5 15L11.5 10" />
    </svg>
  );
}
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Bug:                   <BugAntIcon   width={16} height={16} />,
  Tarea:                 <TaskIcon />,
  Subtarea:              <SubtaskIcon />,
  'Historia de Usuario': <BookOpenIcon width={16} height={16} />,
  'Épica':               <BoltIcon     width={16} height={16} />,
};


// ── UserPickerOption — one avatar+name row ─────────────────────────
function UserPickerOption({ user, displayName }: { user: { id: number }; displayName: string }) {
  const { avatarSvg } = useUserAvatarSvg(user.id);
  return (
    <>
      <div className={styles.avatarCircle}>
        {avatarSvg
          ? <div className={styles.avatarSvg} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
          : <UserIcon width={12} height={12} />
        }
      </div>
      <span>{displayName}</span>
    </>
  );
}

// ── UserAvatarSelect — assignee dropdown with avatars ─────────────
interface UserAvatarSelectProps {
  users: { id: number; nombre: string | null; apellido: string | null; email: string }[];
  value: string;
  onChange: (value: string) => void;
}
function UserAvatarSelect({ users, value, onChange }: UserAvatarSelectProps) {
  const [open,        setOpen]        = useState(false);
  const [popupStyle,  setPopupStyle]  = useState<React.CSSProperties>({});
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Close on outside scroll/resize
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) { setOpen(true); return; }
    const POPUP_W = Math.max(rect.width, 200);
    let left = rect.left;
    if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
    if (left < 8) left = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const style: React.CSSProperties = { position: 'fixed', width: POPUP_W, left, zIndex: 9999 };
    if (spaceBelow < 260 && rect.top > 260) style.bottom = window.innerHeight - rect.top + 6;
    else style.top = rect.bottom + 6;
    setPopupStyle(style);
    setOpen(true);
  }

  const getName = (u: { nombre: string | null; apellido: string | null; email: string }) =>
    [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email;

  const selected = users.find(u => String(u.id) === value);

  return (
    <div className={styles.avatarSelectWrapper} ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.avatarTrigger} ${open ? styles.avatarTriggerOpen : ''}`}
        onClick={toggle}
      >
        {selected ? (
          <span className={styles.avatarTriggerValue}>
            <UserPickerOption user={selected} displayName={getName(selected)} />
          </span>
        ) : (
          <>
            <UserIcon width={16} height={16} style={{ color: 'var(--color-anchor-gray-1)', flexShrink: 0 }} />
            <span className={styles.avatarTriggerPlaceholder}>Sin responsable</span>
          </>
        )}
        <ChevronDownIcon width={13} height={13} className={`${styles.avatarChevron} ${open ? styles.avatarChevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.avatarDropdown} style={popupStyle}>
          <div className={styles.avatarOptionList}>
            <button
              type="button"
              className={`${styles.avatarOption} ${!value ? styles.avatarOptionActive : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              <div className={styles.avatarCircle} style={{ background: 'var(--color-clarity-gray-1)', flexShrink: 0 }}>
                <UserIcon width={12} height={12} style={{ color: 'var(--color-anchor-gray-1)' }} />
              </div>
              <span className={styles.avatarOptionPlaceholder}>Sin responsable</span>
            </button>
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                className={`${styles.avatarOption} ${String(u.id) === value ? styles.avatarOptionActive : ''}`}
                onClick={() => { onChange(String(u.id)); setOpen(false); }}
              >
                <UserPickerOption user={u} displayName={getName(u)} />
              </button>
            ))}
          </div>
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

// ── BlockerMultiSelect — pick multiple blocking items ─────────────
interface BlockerMultiSelectProps {
  items: BacklogItemRecord[];
  types: BacklogTypeRecord[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

function BlockerMultiSelect({ items, types, selectedIds, onChange }: BlockerMultiSelectProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getCode = (item: BacklogItemRecord) => {
    const type = types.find(t => t.id === item.id_tipo);
    const prefix = TYPE_PREFIX[type?.nombre ?? ''] ?? 'IT';
    return `${prefix}-${String(item.id).padStart(2, '0')}`;
  };

  const available = items.filter(i => !selectedIds.includes(i.id));
  const filtered  = search.trim()
    ? available.filter(i =>
        i.nombre.toLowerCase().includes(search.toLowerCase()) ||
        getCode(i).toLowerCase().includes(search.toLowerCase())
      )
    : available;

  const selected = items.filter(i => selectedIds.includes(i.id));

  const remove = (id: number) => onChange(selectedIds.filter(x => x !== id));
  const add    = (id: number) => { onChange([...selectedIds, id]); setSearch(''); setOpen(false); };

  return (
    <div className={styles.blockerWrapper} ref={wrapperRef}>
      <div className={styles.blockerTags}>
        {selected.map(item => (
          <span key={item.id} className={styles.blockerTag}>
            <span className={styles.blockerTagText}>{getCode(item)} — {item.nombre}</span>
            <button type="button" className={styles.blockerTagRemove} onClick={() => remove(item.id)} aria-label={`Quitar ${getCode(item)}`}>×</button>
          </span>
        ))}
        <button type="button" className={styles.blockerAddBtn} onClick={() => setOpen(o => !o)}>
          + Añadir
        </button>
      </div>

      {open && (
        <div className={styles.blockerDropdown}>
          <input
            autoFocus
            type="text"
            className={styles.blockerSearch}
            placeholder="Buscar ítem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.blockerList}>
            {filtered.length === 0
              ? <span className={styles.blockerEmpty}>Sin resultados.</span>
              : filtered.slice(0, 25).map(item => (
                  <button key={item.id} type="button" className={styles.blockerOption} onClick={() => add(item.id)}>
                    <span className={styles.blockerOptionCode}>{getCode(item)}</span>
                    <span className={styles.blockerOptionName}>{item.nombre}</span>
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
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
  meta: BacklogMeta;
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
  tiempo_estimado: string;   // horas, como texto del input
}

const EMPTY_FORM: FormState = {
  nombre: '', descripcion: '', id_tipo: '', id_estatus: '',
  id_prioridad: '', id_sprint: '', fecha_inicio: '', fecha_vencimiento: '',
  id_backlog_item_padre: '', id_usuario_responsable: '', complejidad: null,
  tiempo_estimado: '',
};

const CreateBacklogItemForm: React.FC<CreateBacklogItemFormProps> = ({
  projectId, userId, meta, isOpen, onClose, onCreated,
}) => {
  const { submit, loading: submitting, error } = useCreateBacklogItem();
  const isPM = meta.etiquetas.some(
    e => e.id_usuario === userId && e.id_etiqueta_proyecto_predeterminada === 1,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [bloqueadores,   setBloqueadores]   = useState<number[]>([]);
  const [nombreTouched,  setNombreTouched]  = useState(false);
  const [estatusTouched, setEstatusTouched] = useState(false);
  const [tipoTouched,    setTipoTouched]    = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setNombreTouched(true);
    setEstatusTouched(true);
    setTipoTouched(true);
    if (!form.nombre.trim() || !form.id_estatus || !form.id_tipo) return;

    // El input es en horas; la columna tiempo_estimado se guarda en minutos.
    const horas = form.tiempo_estimado.trim();
    const tiempoEstimadoMin =
      horas !== '' && Number.isFinite(Number(horas)) && Number(horas) >= 0
        ? Math.round(Number(horas) * 60)
        : null;

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
      tiempo_estimado:        tiempoEstimadoMin,
    };
    try {
      const newItem = await submit(payload);
      if (newItem?.id) {
        if (!isPM) {
          await createSugerencia(newItem.id);
        }
        if (bloqueadores.length > 0) {
          await Promise.all(
            bloqueadores.map(blockerItemId =>
              addBacklogItemBlock(newItem.id, blockerItemId, userId)
            )
          );
        }
      }
      setBloqueadores([]);
      onCreated?.();
      onClose();
    } catch (err) {
      setLocalError(friendlyError(err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <FormPopUp
      eyebrow="Backlog"
      title="Nuevo ítem de backlog"
      subtitle="Completa los campos para agregar un nuevo ítem."
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
              <Select
                options={[
                  { value: '', label: 'Sin prioridad', icon: <MinusIcon width={16} height={16} />, color: 'var(--color-anchor-gray-1)' },
                  ...meta.priorities.map(p => {
                    const cfg = priorityConfig(p);
                    return { value: String(p.id), label: p.nombre, icon: cfg.icon, color: cfg.color };
                  }),
                ]}
                value={form.id_prioridad}
                onChange={v => setForm(f => ({ ...f, id_prioridad: v }))}
                required
              />
            </div>
          </div>

          {/* Row: Sprint + Responsable */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Sprint</label>
              <Select
                options={meta.sprints.map(s => ({ value: String(s.id), label: s.nombre }))}
                value={form.id_sprint}
                onChange={v => setForm(f => ({ ...f, id_sprint: v }))}
                placeholder="Sin sprint"
                emptyLabel="Sin sprint"
                searchable
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Responsable</label>
              <UserAvatarSelect
                users={meta.users}
                value={form.id_usuario_responsable}
                onChange={v => setForm(f => ({ ...f, id_usuario_responsable: v }))}
              />
            </div>
          </div>

          {/* Row: Fechas */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha inicio</label>
              <DatePicker
                value={form.fecha_inicio}
                onChange={v => setForm(f => ({ ...f, fecha_inicio: v }))}
                placeholder="Seleccionar fecha"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha vencimiento</label>
              <DatePicker
                value={form.fecha_vencimiento}
                onChange={v => setForm(f => ({ ...f, fecha_vencimiento: v }))}
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>

          {/* Row: Tipo + Tiempo estimado — Tipo determines parent options */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                Tipo <span className={styles.required}>*</span>
              </label>
              <Select
                options={meta.types.map(t => ({ value: String(t.id), label: t.nombre, icon: TYPE_ICONS[t.nombre] }))}
                value={form.id_tipo}
                onChange={v => { setTipoTouched(true); setForm(f => ({ ...f, id_tipo: v, id_backlog_item_padre: '' })); }}
                placeholder="Seleccionar tipo..."
                onBlur={() => setTipoTouched(true)}
                hasError={tipoTouched && !form.id_tipo}
                required
                searchable
              />
              {tipoTouched && !form.id_tipo && (
                <p className={styles.fieldError}>Selecciona un tipo para continuar.</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="tiempo_estimado">Tiempo estimado (h)</label>
              <input
                id="tiempo_estimado"
                name="tiempo_estimado"
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="Ej. 8"
                value={form.tiempo_estimado}
                onChange={e =>
                  setForm(f => ({ ...f, tiempo_estimado: e.target.value.replace(/[^0-9]/g, '') }))
                }
              />
            </div>
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
            const parentPrefix = TYPE_PREFIX[parentTypeName] ?? 'IT';
            return (
              <div className={styles.field}>
                <label className={styles.label}>Ítem padre <span className={styles.parentTypeHint}>({parentTypeName})</span></label>
                <Select
                  options={validParents.map(item => ({
                    value: String(item.id),
                    label: `${parentPrefix}-${String(item.id).padStart(2, '0')} — ${item.nombre}`,
                  }))}
                  value={form.id_backlog_item_padre}
                  onChange={v => setForm(f => ({ ...f, id_backlog_item_padre: v }))}
                  placeholder="Sin ítem padre"
                  emptyLabel="Sin ítem padre"
                  small
                  searchable
                />
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

          {/* Bloqueado por */}
          <div className={styles.field}>
            <label className={styles.label}>Bloqueado por</label>
            <BlockerMultiSelect
              items={meta.items}
              types={meta.types}
              selectedIds={bloqueadores}
              onChange={setBloqueadores}
            />
          </div>

          {(error || localError) && (
            <p className={styles.error}>{localError ?? friendlyError(error!)}</p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn}
              disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear ítem'}
            </button>
          </div>
      </form>
    </FormPopUp>
  );
};

export default CreateBacklogItemForm;
