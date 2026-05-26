import React, { useEffect, useRef, useState } from 'react';
import {
  XMarkIcon,
  UserIcon,
  BoltIcon,
  BugAntIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MinusIcon,
  PencilIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import { Select } from '@/shared/components/Select/Select';
import { DatePicker } from '@/shared/components/DatePicker/DatePicker';
import { updateBacklogItem } from '@/features/project/Backlog/services/backlog.service';
import { fetchBacklogItemGithub, fetchGithubConfig, createGithubBranch, createGithubPR, deleteGithubBranch, type BacklogItemGithubRecord, type GithubConfigRecord } from '@/features/project/projectConfig/services/projectConfig.service';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import type {
  BacklogItemRecord,
  BacklogMeta,
  BacklogStatusRecord,
  UpdateBacklogItemPayload,
} from '@/features/project/Backlog/types/backlog.types';
import styles from './ViewItemDetail.module.css';

// ── Constants ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' },
  2: { color: '#DBEAFE', textColor: '#1D4ED8' },
  3: { color: '#FEF3C7', textColor: '#D97706' },
  4: { color: '#FDE68A', textColor: '#92400E' }, // Pendiente
  5: { color: '#D1FAE5', textColor: '#065F46' }, // Completado
};

const TYPE_PREFIX: Record<string, string> = {
  'Historia de Usuario': 'HU',
  'Tarea':               'TA',
  'Bug':                 'BG',
  'Épica':               'EP',
  'Subtarea':            'ST',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Bug:                   <BugAntIcon     width={14} height={14} />,
  'Historia de Usuario': <BookOpenIcon   width={14} height={14} />,
  'Épica':               <BoltIcon       width={14} height={14} />,
  Tarea: (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 8L7.5 10.5L11 5.5" />
    </svg>
  ),
  Subtarea: (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1.5" y1="0.5" x2="1.5" y2="12.5" />
      <line x1="1.5" y1="4"    x2="5" y2="4" />
      <line x1="1.5" y1="12.5" x2="5" y2="12.5" />
      <rect x="5" y="1" width="6" height="6" />
      <path d="M6.5 4L7.5 6.5L11.5 1.5" />
      <rect x="5" y="9.5" width="6" height="6" />
      <path d="M6.5 12.5L7.5 15L11.5 10" />
    </svg>
  ),
};

const PRIORITY_OPTIONS: Record<string, { icon: React.ReactNode; color: string }> = {
  'Crítica': { icon: <ChevronDoubleUpIcon   width={14} height={14} />, color: 'var(--color-mahindra-red)' },
  'Alta':    { icon: <ChevronUpIcon         width={14} height={14} />, color: '#f97316' },
  'Media':   { icon: <MinusIcon             width={14} height={14} />, color: 'var(--color-anchor-gray-1)' },
  'Baja':    { icon: <ChevronDownIcon       width={14} height={14} />, color: '#3b82f6' },
  'Mínima':  { icon: <ChevronDoubleDownIcon width={14} height={14} />, color: '#1d4ed8' },
};

// ── GitHub branch helpers ─────────────────────────────────────────────
const PREFIX_MAP_CLIENT: Record<string, string> = {
  'Historia de Usuario': 'feat',
  'Tarea':               'task',
  'Bug':                 'fix',
  'Épica':               'epic',
  'Subtarea':            'subtask',
};

function slugifyClient(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

// ── Inline select sub-components ─────────────────────────────────────
function StatusPillSelect({ statuses, value, onChange }: {
  statuses: BacklogStatusRecord[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const STATUS_COLORS_BG: Record<number, { bg: string; text: string }> = {
    1: { bg: '#F3F4F6', text: '#6B7280' },
    2: { bg: '#DBEAFE', text: '#1D4ED8' },
    3: { bg: '#FEF3C7', text: '#D97706' },
    4: { bg: '#FDE68A', text: '#92400E' },
    5: { bg: '#D1FAE5', text: '#065F46' },
  };
  const selected = statuses.find(s => String(s.id) === value);
  const { bg, text } = selected ? (STATUS_COLORS_BG[selected.orden] ?? { bg: '#F3F4F6', text: '#6B7280' }) : { bg: 'var(--color-clarity-gray-1)', text: 'var(--color-anchor-gray-1)' };

  return (
    <div className={styles.inlineSelect} ref={ref}>
      <button type="button" className={styles.pillTrigger} style={{ backgroundColor: bg, color: text }} onClick={() => setOpen(o => !o)}>
        <span>{selected?.nombre ?? 'Seleccionar...'}</span>
        <ChevronDownIcon width={11} height={11} />
      </button>
      {open && (
        <div className={styles.pillDropdown}>
          {statuses.map(s => {
            const c = STATUS_COLORS_BG[s.orden] ?? { bg: '#F3F4F6', text: '#6B7280' };
            return (
              <button key={s.id} type="button" className={`${styles.pillOption} ${String(s.id) === value ? styles.pillOptionActive : ''}`}
                style={{ backgroundColor: c.bg, color: c.text }}
                onClick={() => { onChange(String(s.id)); setOpen(false); }}>
                {s.nombre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Time tracking popup ───────────────────────────────────────────────
interface TimeTrackingPopupProps {
  title: string;
  currentMinutes: number | null;
  onSave: (minutes: number | null, onError: (msg: string) => void) => void;
  onClose: () => void;
}

function TimeTrackingPopup({ title, currentMinutes, onSave, onClose }: TimeTrackingPopupProps) {
  const [value, setValue]     = useState(currentMinutes ? String(Math.round(currentMinutes / 60)) : '');
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = () => {
    // El input es en horas enteras; la columna se guarda en minutos.
    const horas   = Number(value.trim());
    const minutes = value.trim() === '' || horas <= 0 ? null : horas * 60;
    setSaving(true);
    onSave(minutes, (msg) => { setError(msg); setSaving(false); });
  };

  return (
    <div className={styles.timePopupOverlay} data-detail-panel onClick={onClose}>
      <div className={styles.timePopup} onClick={e => e.stopPropagation()}>
        <div className={styles.timePopupHeader}>
          <span className={styles.timePopupTitle}>{title}</span>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">
            <XMarkIcon width={16} height={16} />
          </button>
        </div>

        <div className={styles.timePopupBody}>
          <label className={styles.timePopupLabel}>{title}</label>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className={`${styles.timePopupInput} ${error ? styles.timePopupInputError : ''}`}
            value={value}
            onChange={e => { setValue(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            placeholder="ej. 8"
          />
          {error && <span className={styles.timePopupError}>{error}</span>}
          <p className={styles.timePopupHint}>
            Ingresa el número de horas — solo enteros.
          </p>
        </div>

        <div className={styles.timePopupActions}>
          <button type="button" className={styles.cancelEditBtn} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            <CheckIcon width={13} height={13} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recursive descendant collector ───────────────────────────────────
function collectDescendants(
  parentId: number,
  allItems: BacklogItemRecord[],
  depth = 1,
): { item: BacklogItemRecord; depth: number }[] {
  const children = allItems.filter(i => i.id_backlog_item_padre === parentId);
  return children.flatMap(child => [
    { item: child, depth },
    ...collectDescendants(child.id, allItems, depth + 1),
  ]);
}

// ── UserAvatar ────────────────────────────────────────────────────────
function UserAvatar({ userId }: { userId: number }) {
  const { avatarSvg } = useUserAvatarSvg(userId);
  return (
    <div className={styles.avatarCircle}>
      {avatarSvg
        ? <div className={styles.avatarSvg} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
        : <UserIcon width={12} height={12} />
      }
    </div>
  );
}

// ── UserSelectOption — renders avatar + name for one user ─────────────
function UserSelectOption({ user, displayName }: { user: { id: number }; displayName: string }) {
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

// ── UserSelect — custom dropdown with avatar + name per option ────────
interface UserSelectProps {
  value: string;
  users: { id: number; nombre: string | null; apellido: string | null; email: string }[];
  onChange: (id: string) => void;
}
function UserSelect({ value, users, onChange }: UserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getDisplayName = (u: { nombre: string | null; apellido: string | null; email: string }) =>
    [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email;

  const selected = users.find(u => String(u.id) === value) ?? null;

  return (
    <div ref={ref} className={styles.userSelect}>
      <button type="button" className={styles.userSelectTrigger} onClick={() => setOpen(o => !o)}>
        <span className={styles.userSelectValue}>
          {selected
            ? <UserSelectOption user={selected} displayName={getDisplayName(selected)} />
            : <span className={styles.userSelectPlaceholder}>Sin responsable</span>
          }
        </span>
        <ChevronDownIcon width={12} height={12} className={open ? styles.userSelectChevronOpen : styles.userSelectChevron} />
      </button>

      {open && (
        <div className={styles.userSelectMenu}>
          <button
            type="button"
            className={`${styles.userSelectItem} ${!value ? styles.userSelectItemActive : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <span className={styles.userSelectPlaceholder}>Sin responsable</span>
          </button>
          {users.map(u => (
            <button
              key={u.id}
              type="button"
              className={`${styles.userSelectItem} ${String(u.id) === value ? styles.userSelectItemActive : ''}`}
              onClick={() => { onChange(String(u.id)); setOpen(false); }}
            >
              <UserSelectOption user={u} displayName={getDisplayName(u)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subtask tree ──────────────────────────────────────────────────────
const STATUS_COLORS_BG: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' },
  2: { color: '#DBEAFE', textColor: '#1D4ED8' },
  3: { color: '#FEF3C7', textColor: '#D97706' },
  4: { color: '#FDE68A', textColor: '#92400E' },
  5: { color: '#D1FAE5', textColor: '#065F46' },
};

interface SubtaskNodeProps {
  item: BacklogItemRecord;
  allItems: BacklogItemRecord[];
  meta: BacklogMeta;
  depth: number;
  onSelect: (item: BacklogItemRecord) => void;
}

function SubtaskNode({ item, allItems, meta, depth, onSelect }: SubtaskNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const children  = allItems.filter(i => i.id_backlog_item_padre === item.id);
  const typeRec   = meta.types.find(t => t.id === item.id_tipo);
  const statusRec = meta.statuses.find(s => s.id === item.id_estatus);
  const colors    = statusRec ? (STATUS_COLORS_BG[statusRec.orden] ?? STATUS_COLORS_BG[1]) : STATUS_COLORS_BG[1];
  const prefix    = TYPE_PREFIX[typeRec?.nombre ?? ''] ?? 'IT';
  const code      = `${prefix}-${String(item.id).padStart(2, '0')}`;

  return (
    <>
      <div style={{ marginLeft: `${depth * 16}px` }}>
      <div className={styles.subtaskRow}>
        {children.length > 0
          ? (
            <button type="button" className={styles.subtaskToggle} onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Contraer' : 'Expandir'}>
              <ChevronDownIcon width={11} height={11} className={`${styles.subtaskToggleIcon} ${expanded ? styles.subtaskToggleOpen : ''}`} />
            </button>
          )
          : <span className={styles.subtaskToggleSpacer} />
        }
        <span className={styles.subtaskCode}>{code}</span>
        <span className={styles.subtaskName} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >{item.nombre}</span>
        <span className={styles.subtaskStatus} style={{ backgroundColor: colors.color, color: colors.textColor }}>
          {statusRec?.nombre ?? '—'}
        </span>
      </div>
      </div>
      {expanded && children.map(child => (
        <SubtaskNode key={child.id} item={child} allItems={allItems} meta={meta} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  );
}

// ── Form state ────────────────────────────────────────────────────────
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

function itemToForm(item: BacklogItemRecord): FormState {
  return {
    nombre:                 item.nombre,
    descripcion:            item.descripcion ?? '',
    id_tipo:                item.id_tipo                != null ? String(item.id_tipo)                : '',
    id_estatus:             String(item.id_estatus),
    id_prioridad:           item.id_prioridad           != null ? String(item.id_prioridad)           : '',
    id_sprint:              item.id_sprint              != null ? String(item.id_sprint)              : '',
    fecha_inicio:           item.fecha_inicio           ?? '',
    fecha_vencimiento:      item.fecha_vencimiento      ?? '',
    id_backlog_item_padre:  item.id_backlog_item_padre  != null ? String(item.id_backlog_item_padre)  : '',
    id_usuario_responsable: item.id_usuario_responsable != null ? String(item.id_usuario_responsable) : '',
    complejidad:            item.complejidad ?? null,
  };
}

// ── Props ─────────────────────────────────────────────────────────────
interface ViewItemDetailProps {
  item: BacklogItemRecord;
  meta: BacklogMeta;
  isSuggestion?: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onNavigate?: (item: BacklogItemRecord) => void;
  onAcceptSuggestion?: () => Promise<void>;
  initialEditing?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────
const ViewItemDetail: React.FC<ViewItemDetailProps> = ({ item, meta, isSuggestion = false, onClose, onUpdated, onNavigate, onAcceptSuggestion, initialEditing = false }) => {
  const [isEditing, setIsEditing]                 = useState(initialEditing);
  const [form, setForm]                           = useState<FormState>(() => itemToForm(item));
  const [submitting, setSubmitting]               = useState(false);
  const [accepting, setAccepting]                 = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [showTimePopup, setShowTimePopup]         = useState(false);

  const [githubRecord, setGithubRecord]           = useState<BacklogItemGithubRecord | null>(null);
  const [githubConfig, setGithubConfig]           = useState<GithubConfigRecord | null>(null);
  const [githubLoading, setGithubLoading]         = useState(true);
  const [prCreating, setPrCreating]               = useState(false);
  const [prError, setPrError]                     = useState<string | null>(null);
  const [branchCreating, setBranchCreating]               = useState(false);
  const [branchError, setBranchError]                     = useState<string | null>(null);
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [deletingBranch, setDeletingBranch]               = useState(false);
  const [deleteBranchError, setDeleteBranchError]         = useState<string | null>(null);
  const [branchSuffix, setBranchSuffix]                   = useState(() => slugifyClient(item.nombre));
  const [prBody, setPrBody]                               = useState('');
  const [copyFeedback, setCopyFeedback]                   = useState<string | null>(null);

  useEffect(() => { setForm(itemToForm(item)); setIsEditing(initialEditing); setBranchSuffix(slugifyClient(item.nombre)); }, [item, initialEditing]);

  useEffect(() => {
    setGithubLoading(true);
    Promise.all([
      fetchBacklogItemGithub(item.id),
      fetchGithubConfig(item.id_proyecto),
    ])
      .then(([record, config]) => { setGithubRecord(record); setGithubConfig(config); })
      .catch(() => {})
      .finally(() => setGithubLoading(false));
  }, [item.id, item.id_proyecto]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleCancel = () => { setForm(itemToForm(item)); setIsEditing(false); setError(null); };

  const handleTimeSave = async (minutes: number | null, onError: (msg: string) => void) => {
    try {
      await updateBacklogItem(item.id, {
        nombre:                 item.nombre,
        descripcion:            item.descripcion,
        id_tipo:                item.id_tipo,
        id_estatus:             item.id_estatus,
        id_prioridad:           item.id_prioridad,
        id_sprint:              item.id_sprint,
        fecha_inicio:           item.fecha_inicio,
        fecha_vencimiento:      item.fecha_vencimiento,
        id_backlog_item_padre:  item.id_backlog_item_padre,
        id_usuario_responsable: item.id_usuario_responsable,
        complejidad:            item.complejidad,
        tiempo:                 minutes,
      });
      onUpdated?.();
      setShowTimePopup(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleAccept = async () => {
    if (!onAcceptSuggestion) return;
    setAccepting(true);
    try { await onAcceptSuggestion(); } finally { setAccepting(false); }
  };

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(key);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  const handleCreatePR = async () => {
    setPrCreating(true);
    setPrError(null);
    try {
      const result = await createGithubPR(
        item.id_proyecto,
        item.id,
        item.nombre,
        prBody || undefined,
        githubConfig?.default_branch,
      );
      setGithubRecord(prev => prev
        ? { ...prev, pr_number: result.prNumber, pr_url: result.prUrl, pr_status: 'open' }
        : prev,
      );
    } catch (err) {
      setPrError(err instanceof Error ? err.message : 'Error al crear PR');
    } finally {
      setPrCreating(false);
    }
  };

  const handleCreateBranch = async () => {
    const branchPrefix = PREFIX_MAP_CLIENT[typeName] ?? 'task';
    const fullBranchName = `${branchPrefix}/JIX-${item.id}-${branchSuffix}`;
    setBranchCreating(true);
    setBranchError(null);
    try {
      const result = await createGithubBranch(item.id_proyecto, item.id, item.nombre, fullBranchName);
      setGithubRecord(prev => prev
        ? { ...prev, branch_name: result.branchName }
        : { branch_name: result.branchName, pr_number: null, pr_url: null, pr_status: null },
      );
    } catch (err) {
      setBranchError(err instanceof Error ? err.message : 'Error al crear rama');
    } finally {
      setBranchCreating(false);
    }
  };

  const handleDeleteBranch = async () => {
    setDeletingBranch(true);
    setDeleteBranchError(null);
    try {
      await deleteGithubBranch(item.id_proyecto, item.id);
      setGithubRecord(prev => prev ? { ...prev, branch_name: null } : prev);
      setShowDeleteBranchModal(false);
    } catch (err) {
      setDeleteBranchError(err instanceof Error ? err.message : 'Error al eliminar rama');
    } finally {
      setDeletingBranch(false);
    }
  };

  const handleCompleteFromMerge = async () => {
    const terminalStatus = meta.statuses.find(s => s.es_terminal);
    if (!terminalStatus) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateBacklogItem(item.id, {
        nombre:                 item.nombre,
        descripcion:            item.descripcion,
        id_tipo:                item.id_tipo,
        id_estatus:             terminalStatus.id,
        id_prioridad:           item.id_prioridad,
        id_sprint:              item.id_sprint,
        fecha_inicio:           item.fecha_inicio,
        fecha_vencimiento:      item.fecha_vencimiento,
        id_backlog_item_padre:  item.id_backlog_item_padre,
        id_usuario_responsable: item.id_usuario_responsable,
        complejidad:            item.complejidad,
      });
      onUpdated?.();
      if (githubRecord?.branch_name) {
        setShowDeleteBranchModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.id_estatus) return;
    setSubmitting(true);
    setError(null);
    const newStatusRecord  = meta.statuses.find(s => s.id === Number(form.id_estatus));
    const becomingTerminal = (newStatusRecord?.es_terminal ?? false) && !item.es_terminal;
    const payload: UpdateBacklogItemPayload = {
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
      complejidad:            form.complejidad,
    };
    try {
      await updateBacklogItem(item.id, payload);
      onUpdated?.();
      setIsEditing(false);
      if (becomingTerminal && githubRecord?.branch_name) {
        setShowDeleteBranchModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View-mode derived values ──────────────────────────────────────
  const typeRecord     = meta.types.find(t => t.id === item.id_tipo);
  const statusRecord   = meta.statuses.find(s => s.id === item.id_estatus);
  const priorityRecord = meta.priorities.find(p => p.id === item.id_prioridad);
  const sprintRecord   = meta.sprints.find(s => s.id === item.id_sprint);
  const assignee       = meta.users.find(u => u.id === item.id_usuario_responsable);
  const creator        = meta.users.find(u => u.id === item.id_usuario_creador);
  const subtasks       = meta.items.filter(i => i.id_backlog_item_padre === item.id);
  const parentItem     = item.id_backlog_item_padre != null ? meta.items.find(i => i.id === item.id_backlog_item_padre) : null;

  const typeName     = typeRecord?.nombre ?? '';
  const prefix       = TYPE_PREFIX[typeName] ?? 'IT';
  const code         = `${prefix}-${String(item.id).padStart(2, '0')}`;
  const statusColors = statusRecord ? (STATUS_COLORS[statusRecord.orden] ?? STATUS_COLORS[1]) : STATUS_COLORS[1];
  const priority     = priorityRecord ? PRIORITY_OPTIONS[priorityRecord.nombre] : null;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  const formatDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  const formatTiempo = (min: number | null) => {
    if (!min) return null;
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const fullName = (u: { nombre: string | null; apellido: string | null; email: string } | undefined) =>
    u ? ([u.nombre, u.apellido].filter(Boolean).join(' ') || u.email) : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} data-detail-panel onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.codeBadge}>
              {TYPE_ICONS[typeName] ?? null}
              {code}
            </span>
            {isSuggestion && (
              <span className={styles.suggestionBadge}>Sugerencia</span>
            )}
          </div>
          <div className={styles.topBarActions}>
            {isEditing ? (
              <>
                {error && <span className={styles.inlineError}>{error}</span>}
                <button type="button" className={styles.cancelEditBtn} onClick={handleCancel} disabled={submitting}>
                  Cancelar
                </button>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={submitting || !form.nombre.trim() || !form.id_estatus}>
                  <CheckIcon width={14} height={14} />
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            ) : (
              <button type="button" className={styles.editBtn} onClick={() => setIsEditing(true)} aria-label="Editar">
                <PencilIcon width={15} height={15} />
                Editar
              </button>
            )}
            <button type="button" className={styles.closePanelBtn} onClick={onClose} aria-label="Cerrar">
              <XMarkIcon style={{ width: '1.25rem', height: '1.25rem', display: 'block', flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ── Main content ── */}
          <div className={styles.main}>

            {/* Title */}
            {isEditing
              ? <input name="nombre" className={styles.editTitleInput} value={form.nombre} onChange={handleChange} placeholder="Nombre del ítem" />
              : <h1 className={styles.title}>{item.nombre}</h1>
            }

            {/* Status */}
            <div className={styles.statusRow}>
              {isEditing
                ? <StatusPillSelect statuses={meta.statuses} value={form.id_estatus} onChange={v => setForm(f => ({ ...f, id_estatus: v }))} />
                : (
                  <span className={styles.statusBadge} style={{ backgroundColor: statusColors.color, color: statusColors.textColor }}>
                    {statusRecord?.nombre ?? '—'}
                  </span>
                )
              }
            </div>

            {/* PR merged banner */}
            {githubRecord?.pr_status === 'merged' && !item.es_terminal && (
              <div className={styles.mergedBanner}>
                <div className={styles.mergedBannerLeft}>
                  <span className={styles.mergedBannerTitle}>PR mergeado</span>
                  <span className={styles.mergedBannerText}>¿Deseas marcar este ítem como completado?</span>
                </div>
                <button
                  type="button"
                  className={styles.mergedBannerConfirmBtn}
                  onClick={() => void handleCompleteFromMerge()}
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Sí, completar'}
                </button>
              </div>
            )}

            {/* Description */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Descripción</span>
              {isEditing
                ? <textarea name="descripcion" className={styles.editTextarea} rows={4} value={form.descripcion} onChange={handleChange} placeholder="Descripción opcional..." />
                : item.descripcion
                  ? <p className={styles.description}>{item.descripcion}</p>
                  : <span className={styles.noDescription}>Sin descripción.</span>
              }
            </div>

            {/* Subtasks — always read-only, recursive tree */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Subtareas</span>
              {subtasks.length === 0
                ? <span className={styles.noSubtasks}>Sin subtareas.</span>
                : (
                  <div className={styles.subtaskList}>
                    {subtasks.map(sub => (
                      <SubtaskNode key={sub.id} item={sub} allItems={meta.items} meta={meta} depth={0} onSelect={i => onNavigate?.(i)} />
                    ))}
                  </div>
                )
              }
            </div>

            {/* GitHub */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>GitHub</span>
              {githubLoading ? (
                <div className={styles.githubCardSkeleton} />
              ) : !githubConfig ? (
                <div className={styles.githubNotConfigured}>
                  GitHub no está conectado a este proyecto. Conéctalo en Configuración del proyecto.
                </div>
              ) : !githubRecord?.branch_name ? (
                <div className={styles.githubCard}>
                  <p className={styles.githubNoBranchText}>Sin rama asociada. Personaliza el nombre y crea una.</p>
                  <div className={styles.branchNameBuilder}>
                    <span className={styles.branchPrefixBadge}>
                      {PREFIX_MAP_CLIENT[typeName] ?? 'task'}/JIX-{item.id}-
                    </span>
                    <input
                      type="text"
                      className={styles.branchSuffixInput}
                      value={branchSuffix}
                      onChange={e => setBranchSuffix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50))}
                      placeholder="nombre-rama"
                      disabled={branchCreating}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.createBranchBtn}
                    onClick={() => void handleCreateBranch()}
                    disabled={branchCreating || !branchSuffix.trim()}
                  >
                    {branchCreating ? 'Creando rama…' : 'Crear rama'}
                  </button>
                  {branchError && <span className={styles.inlineError}>{branchError}</span>}
                </div>
              ) : (
                <div className={styles.githubCard}>
                  <div className={styles.githubBranchLine}>
                    <span className={styles.githubMetaLabel}>Rama</span>
                    <span className={styles.branchChip}>{githubRecord.branch_name}</span>
                    <button
                      type="button"
                      className={styles.deleteBranchBtn}
                      onClick={() => setShowDeleteBranchModal(true)}
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Terminal code blocks */}
                  <div className={styles.codeBlockSection}>
                    <div>
                      <span className={styles.codeBlockLabel}>Trabajar en la rama</span>
                      <div className={styles.codeBlock}>
                        <span className={styles.codeText}>{`git fetch && git checkout ${githubRecord.branch_name}`}</span>
                        <button
                          type="button"
                          className={`${styles.copyBtn} ${copyFeedback === 'checkout' ? styles.copyBtnSuccess : ''}`}
                          onClick={() => handleCopy(`git fetch && git checkout ${githubRecord.branch_name}`, 'checkout')}
                          aria-label="Copiar"
                        >
                          <ClipboardDocumentIcon className={styles.copyIcon} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className={styles.codeBlockLabel}>Clonar repositorio</span>
                      <div className={styles.codeBlock}>
                        <span className={styles.codeText}>{`git clone https://github.com/${githubConfig.github_org}/${githubConfig.github_repo}.git`}</span>
                        <button
                          type="button"
                          className={`${styles.copyBtn} ${copyFeedback === 'clone' ? styles.copyBtnSuccess : ''}`}
                          onClick={() => handleCopy(`git clone https://github.com/${githubConfig.github_org}/${githubConfig.github_repo}.git`, 'clone')}
                          aria-label="Copiar"
                        >
                          <ClipboardDocumentIcon className={styles.copyIcon} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PR section */}
                  <div className={styles.githubPrLine}>
                    <span className={styles.githubMetaLabel}>PR</span>
                    {!githubRecord.pr_number ? (
                      <div className={styles.githubPrCreate}>
                        <textarea
                          className={styles.prBodyInput}
                          placeholder="Descripción del PR (opcional)…"
                          value={prBody}
                          onChange={e => setPrBody(e.target.value)}
                          rows={2}
                          disabled={prCreating}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={styles.createPrBtn}
                            onClick={() => void handleCreatePR()}
                            disabled={prCreating}
                          >
                            {prCreating ? 'Creando PR…' : 'Crear PR'}
                          </button>
                          {prError && <span className={styles.inlineError}>{prError}</span>}
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`${styles.prStatusBadge} ${styles[`prStatus_${githubRecord.pr_status ?? 'open'}`]}`}>
                          {githubRecord.pr_status}
                        </span>
                        <a href={githubRecord.pr_url!} target="_blank" rel="noreferrer" className={styles.prLink}>
                          PR #{githubRecord.pr_number} ↗
                        </a>
                      </>
                    )}
                  </div>

                  <p className={styles.githubDisclaimer}>Los PRs se aceptan/rechazan desde GitHub.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className={styles.sidebar}>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tipo</span>
              {isEditing
                ? <Select
                    options={meta.types.map(t => ({ value: String(t.id), label: t.nombre, icon: TYPE_ICONS[t.nombre] }))}
                    value={form.id_tipo}
                    onChange={v => setForm(f => ({ ...f, id_tipo: v }))}
                    placeholder="Sin tipo"
                    emptyLabel="Sin tipo"
                    searchable
                  />
                : typeName
                  ? <span className={styles.detailValue}>{TYPE_ICONS[typeName]}{typeName}</span>
                  : <span className={styles.detailEmpty}>Sin tipo</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Prioridad</span>
              {isEditing
                ? <Select
                    options={[
                      { value: '', label: 'Sin prioridad', icon: <MinusIcon width={14} height={14} />, color: 'var(--color-anchor-gray-1)' },
                      ...meta.priorities.map(p => {
                        const cfg = PRIORITY_OPTIONS[p.nombre];
                        return { value: String(p.id), label: p.nombre, icon: cfg?.icon, color: cfg?.color };
                      }),
                    ]}
                    value={form.id_prioridad}
                    onChange={v => setForm(f => ({ ...f, id_prioridad: v }))}
                    required
                  />
                : priority && priorityRecord
                  ? <span className={styles.detailValue}><span className={styles.priorityChip} style={{ color: priority.color }}>{priority.icon}{priorityRecord.nombre}</span></span>
                  : <span className={styles.detailEmpty}>Sin prioridad</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Complejidad</span>
              {isEditing
                ? (
                  <div className={styles.complexityRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button"
                        className={`${styles.complexityBtn} ${form.complejidad === n ? styles.complexityBtnActive : ''}`}
                        onClick={() => setForm(f => ({ ...f, complejidad: f.complejidad === n ? null : n }))}>
                        {n}
                      </button>
                    ))}
                  </div>
                )
                : item.complejidad != null
                  ? (
                    <span className={styles.detailValue}>
                      <span className={styles.dotRow}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`${styles.dot} ${i < item.complejidad! ? styles.dotFilled : ''}`} />
                        ))}
                      </span>
                      {item.complejidad} / 5
                    </span>
                  )
                  : <span className={styles.detailEmpty}>Sin complejidad</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tiempo estimado</span>
              {item.tiempo_estimado != null
                ? <span className={styles.detailValue}>{formatTiempo(item.tiempo_estimado)}</span>
                : <span className={styles.detailEmpty}>Sin estimación</span>
              }
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailLabelRow}>
                <span className={styles.detailLabel}>Tiempo real</span>
                <button type="button" className={styles.timEditBtn} onClick={() => setShowTimePopup(true)} aria-label="Editar tiempo real">
                  <PencilIcon width={11} height={11} />
                </button>
              </div>
              {(() => {
                const descendants    = collectDescendants(item.id, meta.items);
                const descendantSum  = descendants.reduce((acc, d) => acc + (d.item.tiempo ?? 0), 0);
                const total          = (item.tiempo ?? 0) + descendantSum || null;
                if (total == null) {
                  return <span className={styles.detailEmpty}>Sin registro</span>;
                }
                return (
                  <div className={styles.timeBreakdown}>
                    <div className={styles.timeTotal}>
                      <span>Tiempo total</span>
                      <span>{formatTiempo(total)}</span>
                    </div>
                    {item.tiempo != null && (
                      <div className={styles.timeRow}>
                        <span className={styles.timeRowLabel}>{code}</span>
                        <span>{formatTiempo(item.tiempo)}</span>
                      </div>
                    )}
                    {descendants.map(({ item: d, depth }) => {
                      if (d.tiempo == null) return null;
                      const dType   = meta.types.find(t => t.id === d.id_tipo);
                      const dPrefix = TYPE_PREFIX[dType?.nombre ?? ''] ?? 'IT';
                      return (
                        <div key={d.id} className={styles.timeRow} style={{ paddingLeft: `${(depth + 1) * 10}px` }}>
                          <span className={styles.timeRowLabel}>{dPrefix}-{String(d.id).padStart(2, '0')}</span>
                          <span>{formatTiempo(d.tiempo)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Sprint</span>
              {isEditing
                ? <Select
                    options={meta.sprints.map(s => ({ value: String(s.id), label: s.nombre }))}
                    value={form.id_sprint}
                    onChange={v => setForm(f => ({ ...f, id_sprint: v }))}
                    placeholder="Sin sprint"
                    emptyLabel="Sin sprint"
                    searchable
                  />
                : sprintRecord
                  ? <span className={styles.detailValue}>{sprintRecord.nombre}</span>
                  : <span className={styles.detailEmpty}>Sin sprint</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Responsable</span>
              {isEditing
                ? <UserSelect
                    value={form.id_usuario_responsable}
                    users={meta.users}
                    onChange={id => setForm(f => ({ ...f, id_usuario_responsable: id }))}
                  />
                : assignee
                  ? <span className={styles.detailValue}><UserAvatar userId={assignee.id} />{fullName(assignee)}</span>
                  : <span className={styles.detailEmpty}>Sin asignar</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ítem padre</span>
              {isEditing
                ? <Select
                    options={meta.items.filter(i => i.id !== item.id).map(i => {
                      const iType   = meta.types.find(t => t.id === i.id_tipo);
                      const iPrefix = TYPE_PREFIX[iType?.nombre ?? ''] ?? 'IT';
                      return {
                        value: String(i.id),
                        label: `${iPrefix}-${String(i.id).padStart(2, '0')} — ${i.nombre}`,
                        icon:  iType ? TYPE_ICONS[iType.nombre] : undefined,
                      };
                    })}
                    value={form.id_backlog_item_padre}
                    onChange={v => setForm(f => ({ ...f, id_backlog_item_padre: v }))}
                    placeholder="Sin ítem padre"
                    emptyLabel="Sin ítem padre"
                    small
                    searchable
                  />
                : parentItem
                  ? <span className={styles.detailValue}>
                      {TYPE_PREFIX[meta.types.find(t => t.id === parentItem.id_tipo)?.nombre ?? ''] ?? 'IT'}
                      -{String(parentItem.id).padStart(2, '0')} {parentItem.nombre}
                    </span>
                  : <span className={styles.detailEmpty}>Sin ítem padre</span>
              }
            </div>

            {isEditing && (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Fecha inicio</span>
                  <DatePicker
                    value={form.fecha_inicio}
                    onChange={v => setForm(f => ({ ...f, fecha_inicio: v }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Fecha vencimiento</span>
                  <DatePicker
                    value={form.fecha_vencimiento}
                    onChange={v => setForm(f => ({ ...f, fecha_vencimiento: v }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </>
            )}

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Creado por</span>
              {creator
                ? <span className={styles.detailValue}><UserAvatar userId={creator.id} />{fullName(creator)}</span>
                : <span className={styles.detailEmpty}>—</span>
              }
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha de creación</span>
              <span className={styles.detailValue}><CalendarDaysIcon width={13} height={13} />{formatDate(item.fecha_creacion)}</span>
            </div>

            {isSuggestion && onAcceptSuggestion && !isEditing && (
              <div className={styles.acceptRow}>
                <ButtonComponent
                  label={accepting ? 'Aceptando...' : 'Aceptar sugerencia'}
                  onClick={handleAccept}
                  disabled={accepting}
                  variant="primary"
                />
              </div>
            )}

            {!isEditing && item.fecha_inicio && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha de inicio</span>
                <span className={styles.detailValue}><CalendarDaysIcon width={13} height={13} />{formatDate(item.fecha_inicio)}</span>
              </div>
            )}

            {!isEditing && item.fecha_vencimiento && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha de vencimiento</span>
                <span className={styles.detailValue}><CalendarDaysIcon width={13} height={13} />{formatDate(item.fecha_vencimiento)}</span>
              </div>
            )}

            {!isEditing && item.fecha_completado && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha completado</span>
                <span className={styles.detailValue}><CalendarDaysIcon width={13} height={13} />{formatDateTime(item.fecha_completado)}</span>
              </div>
            )}

          </div>
        </div>
      </div>

      {showTimePopup && (
        <TimeTrackingPopup
          title="Editar tiempo real"
          currentMinutes={item.tiempo ?? null}
          onSave={handleTimeSave}
          onClose={() => setShowTimePopup(false)}
        />
      )}

      {showDeleteBranchModal && (
        <div className={styles.timePopupOverlay} onClick={() => { if (!deletingBranch) { setShowDeleteBranchModal(false); setDeleteBranchError(null); } }}>
          <div className={styles.timePopup} onClick={e => e.stopPropagation()}>
            <div className={styles.timePopupHeader}>
              <span className={styles.timePopupTitle}>¿Eliminar la rama?</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => { setShowDeleteBranchModal(false); setDeleteBranchError(null); }}
                disabled={deletingBranch}
                aria-label="Cerrar"
              >
                <XMarkIcon width={16} height={16} />
              </button>
            </div>
            <div className={styles.timePopupBody}>
              <p className={styles.deleteModalText}>
                ¿Deseas eliminar la rama{' '}
                <code className={styles.deleteModalCode}>{githubRecord?.branch_name}</code>{' '}
                de GitHub? Esta acción no se puede deshacer.
              </p>
              {deleteBranchError && <span className={styles.timePopupError}>{deleteBranchError}</span>}
            </div>
            <div className={styles.timePopupActions}>
              <button
                type="button"
                className={styles.cancelEditBtn}
                onClick={() => { setShowDeleteBranchModal(false); setDeleteBranchError(null); }}
                disabled={deletingBranch}
              >
                No, mantener
              </button>
              <button
                type="button"
                className={styles.deleteBranchConfirmBtn}
                onClick={() => void handleDeleteBranch()}
                disabled={deletingBranch}
              >
                {deletingBranch ? 'Eliminando...' : 'Sí, eliminar rama'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewItemDetail;
