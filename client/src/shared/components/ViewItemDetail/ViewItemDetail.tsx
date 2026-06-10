import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ArrowUturnLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import { Select } from '@/shared/components/Select/Select';
import { DatePicker } from '@/shared/components/DatePicker/DatePicker';
import { updateBacklogItem, fetchItemBlockers, fetchItemBlocking, addBacklogItemBlock, removeBacklogItemBlock, fetchComentarios, createComentario, deleteComentario } from '@/features/project/Backlog/services/backlog.service';
import { fetchImpedimentosByItem, createImpedimento, updateImpedimentoResuelto } from '@/features/project/Bitacora/services/bitacora.service';
import FormPopUp from '@/shared/components/FormPopUp/FormPopUp';
import type { ImpedimentoSimpleRecord } from '@/features/project/Bitacora/types/bitacora.types';
import { fetchBacklogItemGithub, fetchGithubConfig, createGithubBranch, createGithubPR, deleteGithubBranch, type BacklogItemGithubRecord, type GithubConfigRecord } from '@/features/project/projectConfig/services/projectConfig.service';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import { useUser } from '@/core/auth/userContext';
import BacklogItemSubscriptionButton from '@/features/project/Backlog/components/BacklogItemSubscriptionButton';
import type {
  BacklogItemRecord,
  BacklogMeta,
  BacklogStatusRecord,
  UpdateBacklogItemPayload,
  ComentarioRecord,
} from '@/features/project/Backlog/types/backlog.types';
import styles from './ViewItemDetail.module.css';

// ── Constants ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' },
  2: { color: '#DBEAFE', textColor: '#1D4ED8' },
  3: { color: '#FEF3C7', textColor: '#D97706' },
  4: { color: '#D1FAE5', textColor: '#065F46' },
};

const TYPE_PREFIX: Record<string, string> = {
  'Historia de Usuario': 'HU',
  'Tarea':               'TA',
  'Bug':                 'BG',
  'Épica':               'EP',
  'Subtarea':            'ST',
};

/** Which type must be the PARENT of a given type */
const VALID_PARENT_TYPE: Record<string, string> = {
  'Historia de Usuario': 'Épica',
  'Tarea':               'Historia de Usuario',
  'Subtarea':            'Tarea',
  'Bug':                 'Subtarea',
};

/** Which type must be the CHILD of a given type */
const VALID_CHILD_TYPE: Record<string, string> = {
  'Épica':               'Historia de Usuario',
  'Historia de Usuario': 'Tarea',
  'Tarea':               'Subtarea',
  'Subtarea':            'Bug',
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
    4: { bg: '#D1FAE5', text: '#065F46' },
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
  4: { color: '#D1FAE5', textColor: '#065F46' },
};

interface SubtaskNodeProps {
  item: BacklogItemRecord;
  allItems: BacklogItemRecord[];
  meta: BacklogMeta;
  depth: number;
  onSelect: (item: BacklogItemRecord) => void;
  onRemove?: (itemId: number) => void;
}

function SubtaskNode({ item, allItems, meta, depth, onSelect, onRemove }: SubtaskNodeProps) {
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
        {children.length > 0 && (
          <button type="button" className={styles.subtaskToggle} onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Contraer' : 'Expandir'}>
            <ChevronDownIcon width={11} height={11} className={`${styles.subtaskToggleIcon} ${expanded ? styles.subtaskToggleOpen : ''}`} />
          </button>
        )}
        {typeRec && (
          <span className={styles.blockTypeIcon} aria-label={typeRec.nombre}>
            {TYPE_ICONS[typeRec.nombre]}
          </span>
        )}
        <span className={styles.subtaskCode}>{code}</span>
        <span className={styles.subtaskName} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >{item.nombre}</span>
        <span className={styles.subtaskStatus} style={{ backgroundColor: colors.color, color: colors.textColor }}>
          {statusRec?.nombre ?? '—'}
        </span>
        {onRemove && (
          <button
            type="button"
            className={styles.blockRemoveBtn}
            onClick={() => onRemove(item.id)}
            aria-label={`Quitar ${code}`}
          >
            ×
          </button>
        )}
      </div>
      </div>
      {expanded && children.map(child => (
        <SubtaskNode key={child.id} item={child} allItems={allItems} meta={meta} depth={depth + 1} onSelect={onSelect} onRemove={onRemove} />
      ))}
    </>
  );
}

// ── BlocksSection ─────────────────────────────────────────────────────
interface BlocksSectionProps {
  linkedItems:    BacklogItemRecord[];
  meta:           BacklogMeta;
  emptyText:      string;
  excludeIds:     Set<number>;
  isEditing:      boolean;
  onSelect:       (item: BacklogItemRecord) => void;
  onRemove:       (itemId: number) => void;
  onAdd:          (itemId: number) => void;
}

function BlocksSection({ linkedItems, meta, emptyText, excludeIds, isEditing, onSelect, onRemove, onAdd }: BlocksSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search,     setSearch]     = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const available = meta.items.filter(i => !excludeIds.has(i.id));
  const filtered  = search.trim()
    ? available.filter(i => {
        const type   = meta.types.find(t => t.id === i.id_tipo);
        const prefix = TYPE_PREFIX[type?.nombre ?? ''] ?? 'IT';
        const code   = `${prefix}-${String(i.id).padStart(2, '0')}`;
        return i.nombre.toLowerCase().includes(search.toLowerCase())
            || code.toLowerCase().includes(search.toLowerCase());
      })
    : available;

  return (
    <div ref={wrapperRef}>
      {linkedItems.length === 0 && (
        <span className={styles.noSubtasks}>{emptyText}</span>
      )}
      {linkedItems.length > 0 && (
        <div className={styles.subtaskList}>
          {linkedItems.map(item => {
            const typeRec   = meta.types.find(t => t.id === item.id_tipo);
            const statusRec = meta.statuses.find(s => s.id === item.id_estatus);
            const colors    = statusRec ? (STATUS_COLORS_BG[statusRec.orden] ?? STATUS_COLORS_BG[1]) : STATUS_COLORS_BG[1];
            const prefix    = TYPE_PREFIX[typeRec?.nombre ?? ''] ?? 'IT';
            const code      = `${prefix}-${String(item.id).padStart(2, '0')}`;
            return (
              <div key={item.id} className={styles.subtaskRow}>
                {typeRec && (
                  <span className={styles.blockTypeIcon} aria-label={typeRec.nombre}>
                    {TYPE_ICONS[typeRec.nombre]}
                  </span>
                )}
                <span className={styles.subtaskCode}>{code}</span>
                <span
                  className={styles.subtaskName}
                  onClick={() => onSelect(item)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {item.nombre}
                </span>
                <span className={styles.subtaskStatus} style={{ backgroundColor: colors.color, color: colors.textColor }}>
                  {statusRec?.nombre ?? '—'}
                </span>
                {isEditing && (
                  <button
                    type="button"
                    className={styles.blockRemoveBtn}
                    onClick={() => onRemove(item.id)}
                    aria-label={`Quitar ${code}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEditing && <div className={styles.blockAddWrapper}>
        <button type="button" className={styles.blockAddBtn} onClick={() => setPickerOpen(o => !o)}>
          + Añadir
        </button>

        {pickerOpen && (
          <div className={styles.blockPickerDropdown}>
            <input
              autoFocus
              type="text"
              className={styles.blockPickerSearch}
              placeholder="Buscar ítem..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className={styles.blockPickerList}>
              {filtered.length === 0
                ? <span className={styles.blockPickerEmpty}>Sin resultados.</span>
                : filtered.slice(0, 20).map(i => {
                    const type   = meta.types.find(t => t.id === i.id_tipo);
                    const prefix = TYPE_PREFIX[type?.nombre ?? ''] ?? 'IT';
                    const code   = `${prefix}-${String(i.id).padStart(2, '0')}`;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        className={styles.blockPickerOption}
                        onClick={() => { onAdd(i.id); setPickerOpen(false); setSearch(''); }}
                      >
                        {type && <span className={styles.blockTypeIcon}>{TYPE_ICONS[type.nombre]}</span>}
                        <span className={styles.blockPickerCode}>{code}</span>
                        <span className={styles.blockPickerName}>{i.nombre}</span>
                      </button>
                    );
                  })
              }
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────
const MAX_COMMENT_LENGTH = 50;

function commentAuthorName(comment: ComentarioRecord): string {
  return [comment.usuario?.nombre, comment.usuario?.apellido].filter(Boolean).join(' ') || 'Usuario';
}

function CommentAvatar({ userId, small }: { userId: number; small?: boolean }) {
  const { avatarSvg } = useUserAvatarSvg(userId);
  return (
    <div className={`${styles.commentAvatar}${small ? ` ${styles.commentAvatarSmall}` : ''}`}>
      {avatarSvg
        ? <div className={styles.avatarSvg} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
        : <UserIcon width={small ? 10 : 12} height={small ? 10 : 12} />
      }
    </div>
  );
}

interface CommentBubbleProps {
  comment:       ComentarioRecord;
  replies:       ComentarioRecord[];
  allComments:   ComentarioRecord[];
  currentUserId: number;
  onReply:       (parentId: number, text: string) => Promise<void>;
  onDelete:      (commentId: number) => Promise<void>;
  highlightedCommentId?: number | null;
  readOnly?:     boolean;
}

function CommentBubble({
  comment,
  replies,
  allComments,
  currentUserId,
  onReply,
  onDelete,
  highlightedCommentId = null,
  readOnly = false,
}: CommentBubbleProps) {
  const [replyingToId,  setReplyingToId]  = useState<number | null>(null);
  const [collapsed,     setCollapsed]     = useState(false);
  const [replyText,     setReplyText]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const toggleReply = (id: number) => {
    if (readOnly) return;
    setReplyingToId(prev => (prev === id ? null : id));
    setReplyText('');
  };

  const handleSubmitReply = async () => {
    if (readOnly || !replyText.trim() || replyingToId === null) return;
    setSubmitting(true);
    try {
      await onReply(replyingToId, replyText.trim());
      setReplyText('');
      setReplyingToId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (readOnly) return;
    setDeleting(true);
    try { await onDelete(id); }
    finally { setDeleting(false); setConfirmDelete(null); }
  };

  // How many hops from the top-level comment — drives left indentation
  const depthOf = (r: ComentarioRecord): number => {
    let depth = 0;
    let parentId = r.id_comentario_padre;
    while (parentId !== null && parentId !== comment.id) {
      const parent = allComments.find(c => c.id === parentId);
      if (!parent) break;
      parentId = parent.id_comentario_padre;
      depth++;
    }
    return depth;
  };

  // Name of the comment being replied to (shown in compose box header)
  const replyTargetName = replyingToId !== null && replyingToId !== comment.id
    ? commentAuthorName(allComments.find(c => c.id === replyingToId) ?? { usuario: null } as ComentarioRecord)
    : null;

  const renderReplyCompose = (indentRem: number) => (
    <div className={styles.replyBox} style={{ marginLeft: `${indentRem}rem` }}>
      {replyTargetName && (
        <p className={styles.replyingToChip}>Respondiendo a <strong>{replyTargetName}</strong></p>
      )}
      <textarea
        className={styles.commentTextarea}
        rows={2}
        placeholder="Escribe una respuesta…"
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        disabled={submitting || readOnly}
        maxLength={MAX_COMMENT_LENGTH}
        autoFocus
      />
      <span className={`${styles.charCount}${replyText.length >= MAX_COMMENT_LENGTH ? ` ${styles.charCountMax}` : replyText.length >= MAX_COMMENT_LENGTH * 0.8 ? ` ${styles.charCountWarn}` : ''}`}>
        {replyText.length} / {MAX_COMMENT_LENGTH}
      </span>
      <div className={styles.commentActions}>
        <button
          type="button"
          className={styles.commentSubmitBtn}
          onClick={() => void handleSubmitReply()}
          disabled={submitting || readOnly || !replyText.trim()}
        >
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          type="button"
          className={styles.commentCancelBtn}
          onClick={() => { setReplyingToId(null); setReplyText(''); }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  const BASE_INDENT = 2.25; // rem — aligns with avatar width
  const LEVEL_STEP  = 1.5;  // rem per depth level

  return (
    <div className={styles.commentThread}>
      {/* Top-level comment */}
      <div
        className={`${styles.comment}${highlightedCommentId === comment.id ? ` ${styles.commentHighlighted}` : ''}`}
        data-comment-id={comment.id}
      >
        <CommentAvatar userId={comment.id_usuario_creador} />
        <div className={styles.commentBody}>
          <span className={styles.commentAuthor}>{commentAuthorName(comment)}</span>
          <p className={styles.commentText}>{comment.cuerpo}</p>
          <div className={styles.commentMeta}>
            {!readOnly && (
              <button type="button" className={styles.replyIconBtn} title="Responder" onClick={() => toggleReply(comment.id)}>
                <ArrowUturnLeftIcon width={13} height={13} />
              </button>
            )}
            {replies.length > 0 && (
              <button type="button" className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)}>
                {collapsed ? `▶ ${replies.length} respuesta${replies.length !== 1 ? 's' : ''}` : '▼ Ocultar'}
              </button>
            )}
            {!readOnly && comment.id_usuario_creador === currentUserId && (
              confirmDelete === comment.id ? (
                <span className={styles.deleteConfirm}>
                  ¿Eliminar?
                  <button type="button" className={styles.deleteYesBtn} onClick={() => void handleDelete(comment.id)} disabled={deleting || readOnly}>Sí</button>
                  <button type="button" className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(null)} disabled={readOnly}>No</button>
                </span>
              ) : (
                  <button type="button" className={styles.commentDeleteBtn} onClick={() => setConfirmDelete(comment.id)}>×</button>
              )
            )}
          </div>
        </div>
      </div>

      {replyingToId === comment.id && renderReplyCompose(BASE_INDENT)}

      {!collapsed && replies.map(r => {
        const depth      = depthOf(r);
        const indentRem  = BASE_INDENT + depth * LEVEL_STEP;
        return (
          <React.Fragment key={r.id}>
            <div
              className={`${styles.commentReply}${highlightedCommentId === r.id ? ` ${styles.commentHighlighted}` : ''}`}
              data-comment-id={r.id}
              style={{ marginLeft: `${indentRem}rem` }}
            >
              <CommentAvatar userId={r.id_usuario_creador} small />
              <div className={styles.commentBody}>
                <span className={styles.commentAuthor}>{commentAuthorName(r)}</span>
                <p className={styles.commentText}>{r.cuerpo}</p>
                <div className={styles.commentMeta}>
                  {!readOnly && (
                    <button type="button" className={styles.replyIconBtn} title="Responder" onClick={() => toggleReply(r.id)}>
                      <ArrowUturnLeftIcon width={13} height={13} />
                    </button>
                  )}
                  {!readOnly && r.id_usuario_creador === currentUserId && (
                    confirmDelete === r.id ? (
                      <span className={styles.deleteConfirm}>
                        ¿Eliminar?
                        <button type="button" className={styles.deleteYesBtn} onClick={() => void handleDelete(r.id)} disabled={deleting || readOnly}>Sí</button>
                        <button type="button" className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(null)} disabled={readOnly}>No</button>
                      </span>
                    ) : (
                      <button type="button" className={styles.commentDeleteBtn} onClick={() => setConfirmDelete(r.id)}>×</button>
                    )
                  )}
                </div>
              </div>
            </div>
            {replyingToId === r.id && renderReplyCompose(indentRem)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface CommentsSectionProps {
  backlogItemId:  number;
  currentUserId:  number;
  focusCommentId?: number | null;
  readOnly?:      boolean;
}

function CommentsSection({
  backlogItemId,
  currentUserId,
  focusCommentId = null,
  readOnly = false,
}: CommentsSectionProps) {
  const [comments,   setComments]   = useState<ComentarioRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [newText,    setNewText]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setComments(await fetchComentarios(backlogItemId)); }
    catch (error) { console.error('Error cargando comentarios:', error); }
    finally { setLoading(false); }
  }, [backlogItemId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (loading || focusCommentId === null) {
      setHighlightedCommentId(null);
      return;
    }

    const target = commentsSectionRef.current?.querySelector<HTMLElement>(
      `[data-comment-id="${focusCommentId}"]`,
    );

    if (!target) {
      setHighlightedCommentId(null);
      return;
    }

    setHighlightedCommentId(focusCommentId);
    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timeoutId = window.setTimeout(() => {
      setHighlightedCommentId(null);
    }, 4000);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [comments, focusCommentId, loading]);

  const handleNew = async () => {
    if (readOnly || !newText.trim()) return;
    setSubmitting(true);
    try {
      await createComentario(backlogItemId, newText.trim(), currentUserId, null);
      setNewText('');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, text: string) => {
    if (readOnly) return;
    await createComentario(backlogItemId, text, currentUserId, parentId);
    await load();
  };

  const handleDelete = async (commentId: number) => {
    if (readOnly) return;
    await deleteComentario(commentId);
    await load();
  };

  const topLevel = comments.filter(c => !c.id_comentario_padre);

  // DFS: each child appears immediately after its parent
  const repliesFor = (topLevelId: number): ComentarioRecord[] => {
    const result: ComentarioRecord[] = [];
    const visit = (id: number) => {
      const children = comments.filter(c => c.id_comentario_padre === id);
      for (const child of children) {
        result.push(child);
        visit(child.id);
      }
    };
    visit(topLevelId);
    return result;
  };

  return (
    <div ref={commentsSectionRef} className={styles.commentsSection}>
      {loading ? (
        <p className={styles.commentsLoading}>Cargando comentarios…</p>
      ) : topLevel.length === 0 ? (
        <p className={styles.noComments}>Sin comentarios aún.</p>
      ) : (
        topLevel.map(c => (
          <CommentBubble
            key={c.id}
            comment={c}
            replies={repliesFor(c.id)}
            allComments={comments}
            currentUserId={currentUserId}
            onReply={handleReply}
            onDelete={handleDelete}
            highlightedCommentId={highlightedCommentId}
            readOnly={readOnly}
          />
        ))
      )}

      {!readOnly && (
        <div className={styles.newCommentBox}>
          <textarea
            className={styles.commentTextarea}
            rows={2}
            placeholder="Añadir un comentario…"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            disabled={submitting}
            maxLength={MAX_COMMENT_LENGTH}
          />
          <span className={`${styles.charCount}${newText.length >= MAX_COMMENT_LENGTH ? ` ${styles.charCountMax}` : newText.length >= MAX_COMMENT_LENGTH * 0.8 ? ` ${styles.charCountWarn}` : ''}`}>
            {newText.length} / {MAX_COMMENT_LENGTH}
          </span>
          <div className={styles.commentActions}>
            <button
              type="button"
              className={styles.commentSubmitBtn}
              onClick={() => void handleNew()}
              disabled={submitting || !newText.trim()}
            >
              {submitting ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Impedimentos section ──────────────────────────────────────────────
function ImpedimentosSection({ itemId, currentUserId, isLocked }: { itemId: number; currentUserId: number; isLocked?: boolean }) {
  const [impedimentos, setImpedimentos] = useState<ImpedimentoSimpleRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showPopup,    setShowPopup]    = useState(false);
  const [nombre,       setNombre]       = useState('');
  const [desc,         setDesc]         = useState('');
  const [costo,        setCosto]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [togglingId,   setTogglingId]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setImpedimentos(await fetchImpedimentosByItem(itemId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [itemId]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await createImpedimento(nombre.trim(), desc.trim() || null, itemId, currentUserId, costo.trim() ? Number(costo) : null);
      setNombre('');
      setDesc('');
      setCosto('');
      setShowPopup(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleResuelto = async (imp: ImpedimentoSimpleRecord) => {
    setTogglingId(imp.id);
    try {
      await updateImpedimentoResuelto(imp.id, !imp.resuelto);
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const closePopup = () => { setShowPopup(false); setNombre(''); setDesc(''); setCosto(''); };

  return (
    <div className={styles.impedimentosBlock}>
      {loading ? (
        <p className={styles.impedimentosEmpty}>Cargando…</p>
      ) : impedimentos.length === 0 ? (
        <p className={styles.impedimentosEmpty}>Sin impedimentos registrados.</p>
      ) : (
        <div className={styles.impedimentosList}>
          {impedimentos.map(imp => (
            <div key={imp.id} className={`${styles.impedimentoItem}${imp.resuelto ? ` ${styles.impedimentoItemResuelto}` : ''}`}>
              <button
                type="button"
                className={`${styles.impedimentoCheckBtn}${imp.resuelto ? ` ${styles.impedimentoCheckBtnDone}` : ''}`}
                title={imp.resuelto ? 'Marcar como pendiente' : 'Marcar como resuelto'}
                onClick={() => void handleToggleResuelto(imp)}
                disabled={togglingId === imp.id}
              >
                <CheckCircleIcon width={16} height={16} />
              </button>
              <div className={styles.impedimentoItemBody}>
                <div className={styles.impedimentoItemTitleRow}>
                  <span className={styles.impedimentoItemNombre}>{imp.nombre}</span>
                  {imp.costo != null && (
                    <span className={styles.impedimentoItemCosto}>{imp.costo.toLocaleString()}</span>
                  )}
                </div>
                {imp.descripcion && <p className={styles.impedimentoItemDesc}>{imp.descripcion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLocked && (
        <button type="button" className={styles.impedimentosAddBtn} onClick={() => setShowPopup(true)}>
          + Nuevo impedimento
        </button>
      )}

      <FormPopUp
        title="Nuevo impedimento"
        isOpen={showPopup}
        onClose={closePopup}
      >
        <div className={styles.impedimentosPopupForm}>
          <div className={styles.impedimentosPopupField}>
            <label className={styles.impedimentosPopupLabel}>
              Nombre <span className={styles.impedimentosPopupRequired}>*</span>
            </label>
            <input
              className={styles.impedimentosPopupInput}
              type="text"
              maxLength={100}
              placeholder="Describe el impedimento…"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              disabled={saving}
              autoFocus
            />
            <span className={styles.impedimentosPopupCount}>{nombre.length} / 100</span>
          </div>

          <div className={styles.impedimentosPopupField}>
            <label className={styles.impedimentosPopupLabel}>
              Descripción <span className={styles.impedimentosPopupOptional}>(opcional)</span>
            </label>
            <textarea
              className={styles.impedimentosPopupTextarea}
              maxLength={250}
              rows={3}
              placeholder="Detalla el impacto o contexto…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              disabled={saving}
            />
            <span className={styles.impedimentosPopupCount}>{desc.length} / 250</span>
          </div>

          <div className={styles.impedimentosPopupField}>
            <label className={styles.impedimentosPopupLabel}>
              Costo estimado <span className={styles.impedimentosPopupOptional}>(opcional)</span>
            </label>
            <input
              className={styles.impedimentosPopupInput}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={costo}
              onChange={e => setCosto(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className={styles.impedimentosPopupActions}>
            <button
              type="button"
              className={styles.impedimentosPopupPrimaryBtn}
              onClick={() => void handleCreate()}
              disabled={saving || !nombre.trim()}
            >
              {saving ? 'Guardando…' : 'Guardar impedimento'}
            </button>
            <button
              type="button"
              className={styles.impedimentosPopupSecondaryBtn}
              onClick={closePopup}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      </FormPopUp>
    </div>
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
  isPM?: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
  onNavigate?: (item: BacklogItemRecord) => void;
  onAcceptSuggestion?: () => Promise<void>;
  onRejectSuggestion?: () => Promise<void>;
  initialEditing?: boolean;
  /** When true the panel renders inline (no fixed overlay) — parent controls sizing */
  inline?: boolean;
  /** When true the sprint is completed — editing is disabled, only comments are allowed */
  isLocked?: boolean;
  readOnly?: boolean;
  onNavigateToProject?: () => void;
  navigateToProjectLabel?: string;
  focusCommentId?: number | null;
}

// ── Component ─────────────────────────────────────────────────────────
const ViewItemDetail: React.FC<ViewItemDetailProps> = ({
  item,
  meta,
  isSuggestion = false,
  isPM = true,
  onClose,
  onUpdated,
  onNavigate,
  onAcceptSuggestion,
  onRejectSuggestion,
  initialEditing = false,
  inline = false,
  isLocked = false,
  readOnly = false,
  onNavigateToProject,
  navigateToProjectLabel = 'Ir al proyecto',
  focusCommentId = null,
}) => {
  const { user, refreshUser } = useUser();
  const canEdit = !readOnly && isPM;
  const canEditTime = !readOnly;
  const [isEditing, setIsEditing]                 = useState(initialEditing && !readOnly && isPM && !isLocked);
  const [form, setForm]                           = useState<FormState>(() => itemToForm(item));
  const [submitting, setSubmitting]               = useState(false);
  const [accepting, setAccepting]                 = useState(false);
  const [rejecting, setRejecting]                 = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [suggestionActionError, setSuggestionActionError] = useState<string | null>(null);
  const [showTimePopup, setShowTimePopup]         = useState(false);
  const [showEstimatedPopup, setShowEstimatedPopup] = useState(false);
  const isEditable = isEditing && canEdit;
  const canShowSuggestionActions = isSuggestion && !isEditing;

  const [relatedExpanded, setRelatedExpanded] = useState(false);

  // ── Block relationships ──
  const [blockerIds,  setBlockerIds]  = useState<Set<number>>(new Set());
  const [blockingIds, setBlockingIds] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    setForm(itemToForm(item));
    setIsEditing(initialEditing && !readOnly && isPM);
    setBranchSuffix(slugifyClient(item.nombre));
    setSuggestionActionError(null);
  }, [item, initialEditing, readOnly, isPM]);

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

  useEffect(() => {
    setBlockerIds(new Set());
    setBlockingIds(new Set());
    Promise.all([fetchItemBlockers(item.id), fetchItemBlocking(item.id)])
      .then(([blockers, blocking]) => {
        setBlockerIds(new Set(blockers.map(b => b.id_bloqueador)));
        setBlockingIds(new Set(blocking.map(b => b.id_bloqueado)));
      })
      .catch(() => {});
  }, [item.id]);

  // ── Block handlers ──
  const handleAddBlocker = async (blockerItemId: number) => {
    if (readOnly || !user) return;
    try {
      await addBacklogItemBlock(item.id, blockerItemId, user!.id);
      setBlockerIds(prev => new Set([...prev, blockerItemId]));
    } catch (err) { console.error('Error añadiendo bloqueador:', err); }
  };

  const handleRemoveBlocker = async (blockerItemId: number) => {
    if (readOnly) return;
    try {
      await removeBacklogItemBlock(item.id, blockerItemId);
      setBlockerIds(prev => { const n = new Set(prev); n.delete(blockerItemId); return n; });
    } catch (err) { console.error('Error quitando bloqueador:', err); }
  };

  const handleAddBlocking = async (blockedItemId: number) => {
    if (readOnly || !user) return;
    try {
      await addBacklogItemBlock(blockedItemId, item.id, user!.id);
      setBlockingIds(prev => new Set([...prev, blockedItemId]));
    } catch (err) { console.error('Error añadiendo bloqueado:', err); }
  };

  const handleRemoveBlocking = async (blockedItemId: number) => {
    if (readOnly) return;
    try {
      await removeBacklogItemBlock(blockedItemId, item.id);
      setBlockingIds(prev => { const n = new Set(prev); n.delete(blockedItemId); return n; });
    } catch (err) { console.error('Error quitando bloqueado:', err); }
  };

  // ── Subtask picker ──
  const [subtaskPickerOpen, setSubtaskPickerOpen] = useState(false);
  const [subtaskSearch,     setSubtaskSearch]     = useState('');
  const subtaskPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subtaskPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (subtaskPickerRef.current && !subtaskPickerRef.current.contains(e.target as Node)) {
        setSubtaskPickerOpen(false);
        setSubtaskSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [subtaskPickerOpen]);

  const handleAddSubtask = async (childItemId: number) => {
    if (readOnly) return;
    const childItem = meta.items.find(i => i.id === childItemId);
    if (!childItem) return;
    try {
      await updateBacklogItem(childItemId, {
        nombre:                 childItem.nombre,
        descripcion:            childItem.descripcion,
        id_tipo:                childItem.id_tipo,
        id_estatus:             childItem.id_estatus,
        id_prioridad:           childItem.id_prioridad,
        id_sprint:              childItem.id_sprint,
        fecha_inicio:           childItem.fecha_inicio,
        fecha_vencimiento:      childItem.fecha_vencimiento,
        id_backlog_item_padre:  item.id,
        id_usuario_responsable: childItem.id_usuario_responsable,
        complejidad:            childItem.complejidad,
      });
      await onUpdated?.();
    } catch (err) { console.error('Error añadiendo subtarea:', err); }
  };

  const handleRemoveSubtask = async (childItemId: number) => {
    if (readOnly) return;
    const childItem = meta.items.find(i => i.id === childItemId);
    if (!childItem) return;
    try {
      await updateBacklogItem(childItemId, {
        nombre:                 childItem.nombre,
        descripcion:            childItem.descripcion,
        id_tipo:                childItem.id_tipo,
        id_estatus:             childItem.id_estatus,
        id_prioridad:           childItem.id_prioridad,
        id_sprint:              childItem.id_sprint,
        fecha_inicio:           childItem.fecha_inicio,
        fecha_vencimiento:      childItem.fecha_vencimiento,
        id_backlog_item_padre:  null,
        id_usuario_responsable: childItem.id_usuario_responsable,
        complejidad:            childItem.complejidad,
      });
      await onUpdated?.();
    } catch (err) { console.error('Error quitando subtarea:', err); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleCancel = () => { setForm(itemToForm(item)); setIsEditing(false); setError(null); };

  const handleTimeSave = async (minutes: number | null, onError: (msg: string) => void) => {
    if (readOnly) return;
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
      await onUpdated?.();
      setShowTimePopup(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleEstimatedTimeSave = async (minutes: number | null, onError: (msg: string) => void) => {
    if (readOnly) return;
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
        tiempo_estimado:        minutes,
      });
      await onUpdated?.();
      setShowEstimatedPopup(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleAccept = async () => {
    if (!onAcceptSuggestion) return;
    setSuggestionActionError(null);
    setAccepting(true);
    try {
      await onAcceptSuggestion();
    } catch (err) {
      setSuggestionActionError(err instanceof Error ? err.message : 'No se pudo aceptar la sugerencia.');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!onRejectSuggestion) return;
    setSuggestionActionError(null);
    setRejecting(true);
    try {
      await onRejectSuggestion();
    } catch (err) {
      setSuggestionActionError(err instanceof Error ? err.message : 'No se pudo rechazar la sugerencia.');
    } finally {
      setRejecting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(key);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  const handleCreatePR = async () => {
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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
      await onUpdated?.();
      void refreshUser();
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
    if (!canEdit) return;
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
      await onUpdated?.();
      void refreshUser();
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
  const blockerItems   = meta.items.filter(i => blockerIds.has(i.id));
  const blockingItems  = meta.items.filter(i => blockingIds.has(i.id));

  const typeName     = typeRecord?.nombre ?? '';
  const prefix       = TYPE_PREFIX[typeName] ?? 'IT';
  const code         = `${prefix}-${String(item.id).padStart(2, '0')}`;

  // Items eligible to become a subtask:
  //   - must be of the valid child type for this item's type
  //   - exclude self and all descendants (prevents cycles)
  const subtaskDescendantIds   = new Set(collectDescendants(item.id, meta.items).map(d => d.item.id));
  const validChildTypeName     = VALID_CHILD_TYPE[typeName];
  const validChildTypeId       = validChildTypeName ? meta.types.find(t => t.nombre === validChildTypeName)?.id : undefined;
  const subtaskPickerAvailable = validChildTypeId != null
    ? meta.items.filter(i => i.id !== item.id && !subtaskDescendantIds.has(i.id) && i.id_tipo === validChildTypeId)
    : [];
  const subtaskPickerFiltered  = subtaskSearch.trim()
    ? subtaskPickerAvailable.filter(i => {
        const type   = meta.types.find(t => t.id === i.id_tipo);
        const pfx    = TYPE_PREFIX[type?.nombre ?? ''] ?? 'IT';
        const cd     = `${pfx}-${String(i.id).padStart(2, '0')}`;
        return i.nombre.toLowerCase().includes(subtaskSearch.toLowerCase())
            || cd.toLowerCase().includes(subtaskSearch.toLowerCase());
      })
    : subtaskPickerAvailable;
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

  const suggestionRecord = meta.sugerencias.find(s => s.id === item.id);
  const suggestionResponder = suggestionRecord?.id_usuario_acepto != null
    ? meta.users.find(u => u.id === suggestionRecord.id_usuario_acepto)
    : undefined;
  const showSuggestionResponse = suggestionRecord != null || isSuggestion;
  const suggestionActionInProgress = accepting || rejecting;

  const panelContent = (
      <div className={`${styles.panel} ${inline ? styles.panelInline : ''}`} data-detail-panel onClick={e => e.stopPropagation()}>

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
            {isEditable ? (
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
              <>
                {onNavigateToProject && (
                  <button
                    type="button"
                    className={styles.navigateProjectBtn}
                    onClick={onNavigateToProject}
                  >
                    {navigateToProjectLabel}
                  </button>
                )}
                {!isLocked && canEdit && (
                  <button type="button" className={styles.editBtn} onClick={() => setIsEditing(true)} aria-label="Editar">
                    <PencilIcon width={15} height={15} />
                    Editar
                  </button>
                )}
              </>
            )}
            <BacklogItemSubscriptionButton backlogItemId={item.id} />
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
            {isEditable
              ? <input name="nombre" className={styles.editTitleInput} value={form.nombre} onChange={handleChange} placeholder="Nombre del ítem" />
              : <h1 className={styles.title}>{item.nombre}</h1>
            }

            {/* Status */}
            <div className={styles.statusRow}>
              {isEditable
                ? <StatusPillSelect statuses={meta.statuses} value={form.id_estatus} onChange={v => setForm(f => ({ ...f, id_estatus: v }))} />
                : (
                  <span className={styles.statusBadge} style={{ backgroundColor: statusColors.color, color: statusColors.textColor }}>
                    {statusRecord?.nombre ?? '—'}
                  </span>
                )
              }
            </div>

            {/* PR merged banner */}
            {githubRecord?.pr_status === 'merged' && !item.es_terminal && canEdit && (
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
              {isEditable
                ? <textarea name="descripcion" className={styles.editTextarea} rows={4} value={form.descripcion} onChange={handleChange} placeholder="Descripción opcional..." />
                : item.descripcion
                  ? <p className={styles.description}>{item.descripcion}</p>
                  : <span className={styles.noDescription}>Sin descripción.</span>
              }
            </div>

            {/* ── Relaciones (collapsible) ── */}
            <div className={styles.section}>
              <button
                type="button"
                className={styles.relatedGroupHeader}
                onClick={() => setRelatedExpanded(e => !e)}
              >
                <span className={styles.sectionTitle}>Relaciones</span>
                <ChevronDownIcon
                  width={12} height={12}
                  className={`${styles.relatedChevron}${relatedExpanded ? ` ${styles.relatedChevronOpen}` : ''}`}
                />
              </button>

              {relatedExpanded && (
                <div className={styles.relatedGroupContent}>
                  <span className={styles.sectionTitle}>Subtareas</span>
                  <div ref={subtaskPickerRef}>
                    {subtasks.length === 0 && (
                      <span className={styles.noSubtasks}>Sin subtareas.</span>
                    )}
                    {subtasks.length > 0 && (
                      <div className={styles.subtaskList}>
                        {subtasks.map(sub => (
                          <SubtaskNode key={sub.id} item={sub} allItems={meta.items} meta={meta} depth={0} onSelect={i => onNavigate?.(i)} onRemove={isEditable ? id => void handleRemoveSubtask(id) : undefined} />
                        ))}
                      </div>
                    )}

                    {isEditable && (
                      <div className={styles.blockAddWrapper}>
                        <button type="button" className={styles.blockAddBtn} onClick={() => setSubtaskPickerOpen(o => !o)}>
                          + Añadir
                        </button>
                        {subtaskPickerOpen && (
                          <div className={styles.blockPickerDropdown}>
                            <input
                              autoFocus
                              type="text"
                              className={styles.blockPickerSearch}
                              placeholder="Buscar ítem..."
                              value={subtaskSearch}
                              onChange={e => setSubtaskSearch(e.target.value)}
                            />
                            <div className={styles.blockPickerList}>
                              {subtaskPickerFiltered.length === 0
                                ? <span className={styles.blockPickerEmpty}>Sin resultados.</span>
                                : subtaskPickerFiltered.slice(0, 20).map(i => {
                                    const type   = meta.types.find(t => t.id === i.id_tipo);
                                    const prefix = TYPE_PREFIX[type?.nombre ?? ''] ?? 'IT';
                                    const code   = `${prefix}-${String(i.id).padStart(2, '0')}`;
                                    return (
                                      <button
                                        key={i.id}
                                        type="button"
                                        className={styles.blockPickerOption}
                                        onClick={() => { void handleAddSubtask(i.id); setSubtaskPickerOpen(false); setSubtaskSearch(''); }}
                                      >
                                        {type && <span className={styles.blockTypeIcon}>{TYPE_ICONS[type.nombre]}</span>}
                                        <span className={styles.blockPickerCode}>{code}</span>
                                        <span className={styles.blockPickerName}>{i.nombre}</span>
                                      </button>
                                    );
                                  })
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <span className={styles.sectionTitle}>Bloqueado por</span>
                  <BlocksSection
                    linkedItems={blockerItems}
                    meta={meta}
                    emptyText="Sin bloqueadores."
                    excludeIds={new Set([item.id, ...blockerIds])}
                    isEditing={isEditable}
                    onSelect={i => onNavigate?.(i)}
                    onRemove={id => void handleRemoveBlocker(id)}
                    onAdd={id => void handleAddBlocker(id)}
                  />

                  <span className={styles.sectionTitle}>Bloqueando a</span>
                  <BlocksSection
                    linkedItems={blockingItems}
                    meta={meta}
                    emptyText="No bloquea ningún ítem."
                    excludeIds={new Set([item.id, ...blockingIds])}
                    isEditing={isEditable}
                    onSelect={i => onNavigate?.(i)}
                    onRemove={id => void handleRemoveBlocking(id)}
                    onAdd={id => void handleAddBlocking(id)}
                  />
                </div>
              )}
            </div>{/* end Relaciones section */}

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
                  {canEdit ? (
                    <>
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
                    </>
                  ) : (
                    <p className={styles.githubNoBranchText}>Sin rama asociada.</p>
                )}
                </div>
              ) : (
                <div className={styles.githubCard}>
                  <div className={styles.githubBranchLine}>
                    <span className={styles.githubMetaLabel}>Rama</span>
                    <span className={styles.branchChip}>{githubRecord.branch_name}</span>
                    {canEdit && (
                      <button
                        type="button"
                        className={styles.deleteBranchBtn}
                        onClick={() => setShowDeleteBranchModal(true)}
                      >
                        Eliminar
                      </button>
                    )}
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
                      canEdit ? (
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
                        <span className={styles.detailEmpty}>Sin PR</span>
                      )
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

            {/* Impedimentos */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Impedimentos</span>
              {user && (
                <ImpedimentosSection itemId={item.id} currentUserId={user.id} isLocked={isLocked} />
              )}
            </div>

            {/* Comentarios */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Comentarios</span>
              {user && (
                <CommentsSection
                  backlogItemId={item.id}
                  currentUserId={user.id}
                  focusCommentId={focusCommentId}
                  readOnly={readOnly}
                />
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className={styles.sidebar}>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tipo</span>
              {isEditable
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
              {isEditable
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
              {isEditable
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
              <div className={styles.detailLabelRow}>
                <span className={styles.detailLabel}>Tiempo estimado</span>
                {canEditTime && (
                  <button type="button" className={styles.timEditBtn} onClick={() => setShowEstimatedPopup(true)} aria-label="Editar tiempo estimado">
                    <PencilIcon width={11} height={11} />
                  </button>
                )}
              </div>
              {item.tiempo_estimado != null
                ? <span className={styles.detailValue}>{formatTiempo(item.tiempo_estimado)}</span>
                : <span className={styles.detailEmpty}>Sin estimación</span>
              }
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailLabelRow}>
                <span className={styles.detailLabel}>Tiempo real</span>
                {!isLocked && canEditTime && (
                  <button type="button" className={styles.timEditBtn} onClick={() => setShowTimePopup(true)} aria-label="Editar tiempo real">
                    <PencilIcon width={11} height={11} />
                  </button>
                )}
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
              {isEditable
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
              {isEditable
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
              {isEditable
                ? (() => {
                    // Only show items of the valid parent type for the currently selected type
                    const editTypeName      = meta.types.find(t => t.id === (form.id_tipo ? Number(form.id_tipo) : item.id_tipo))?.nombre ?? '';
                    const validParentName   = VALID_PARENT_TYPE[editTypeName];
                    const validParentTypeId = validParentName ? meta.types.find(t => t.nombre === validParentName)?.id : undefined;
                    const parentOptions     = validParentTypeId != null
                      ? meta.items.filter(i => i.id !== item.id && i.id_tipo === validParentTypeId)
                      : [];
                    return (
                      <Select
                        options={parentOptions.map(i => {
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
                    );
                  })()
                : parentItem
                  ? <span className={styles.detailValue}>
                      {TYPE_PREFIX[meta.types.find(t => t.id === parentItem.id_tipo)?.nombre ?? ''] ?? 'IT'}
                      -{String(parentItem.id).padStart(2, '0')} {parentItem.nombre}
                    </span>
                  : <span className={styles.detailEmpty}>Sin ítem padre</span>
              }
            </div>

            {isEditable && (
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

            {showSuggestionResponse && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Respuesta de sugerencia</span>
                <div className={styles.suggestionResponseBody}>
                  {suggestionRecord?.aceptada ? (
                    suggestionResponder
                      ? <span className={styles.detailValue}><UserAvatar userId={suggestionResponder.id} />{fullName(suggestionResponder)}</span>
                      : <span className={styles.detailEmpty}>Usuario no disponible</span>
                  ) : (
                    <span className={styles.detailEmpty}>Pendiente</span>
                  )}
                </div>
              </div>
            )}

            {canShowSuggestionActions && (onAcceptSuggestion || onRejectSuggestion) && (
              <div className={styles.suggestionActionsRow}>
                {onAcceptSuggestion && (
                  <ButtonComponent
                    label={accepting ? 'Aceptando...' : 'Aceptar sugerencia'}
                    onClick={handleAccept}
                    disabled={suggestionActionInProgress}
                    variant="primary"
                  />
                )}
                {onRejectSuggestion && (
                  <div className={styles.rejectSuggestionAction}>
                    <ButtonComponent
                      label={rejecting ? 'Rechazando...' : 'Rechazar sugerencia'}
                      onClick={handleReject}
                      disabled={suggestionActionInProgress}
                      variant="secondary"
                    />
                  </div>
                )}
                {suggestionActionError && (
                  <span className={styles.suggestionActionError}>{suggestionActionError}</span>
                )}
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
  );

  const popups = (
    <>
      {showTimePopup && canEditTime && (
        <TimeTrackingPopup
          title="Editar tiempo real"
          currentMinutes={item.tiempo ?? null}
          onSave={handleTimeSave}
          onClose={() => setShowTimePopup(false)}
        />
      )}

      {showEstimatedPopup && canEditTime && (
        <TimeTrackingPopup
          title="Editar tiempo estimado"
          currentMinutes={item.tiempo_estimado ?? null}
          onSave={handleEstimatedTimeSave}
          onClose={() => setShowEstimatedPopup(false)}
        />
      )}

      {showDeleteBranchModal && canEdit && (
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
    </>
  );

  if (inline) {
    return <>{panelContent}{popups}</>;
  }

  return (
    <div className={styles.overlay}>
      {panelContent}
      {popups}
    </div>
  );
};

export default ViewItemDetail;
