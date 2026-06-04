import React, { useEffect, useRef, useState } from 'react';
import {
  BugAntIcon,
  BookOpenIcon,
  BoltIcon,
  ChevronDoubleDownIcon,
  ChevronDoubleUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  MinusIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import ContextMenu from '@/shared/components/ContextMenu';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import { useBacklogItemSubscription } from '../../hooks/useBacklogItemSubscription';
import styles from './BacklogListItem.module.css';

export type BacklogItemType = 'Bug' | 'Tarea' | 'Subtarea' | 'Historia de Usuario' | 'Épica';

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
      {/* vertical connector — starts above top branch */}
      <line x1="1.5" y1="0.5" x2="1.5" y2="12.5" />
      {/* horizontal branches */}
      <line x1="1.5" y1="4"   x2="5" y2="4" />
      <line x1="1.5" y1="12.5" x2="5" y2="12.5" />
      {/* top checkbox — 6×6 square */}
      <rect x="5" y="1" width="6" height="6" />
      <path d="M6.5 4L7.5 6.5L11.5 1.5" />
      {/* bottom checkbox — 6×6 square, ends at y=15.5 to avoid clipping */}
      <rect x="5" y="9.5" width="6" height="6" />
      <path d="M6.5 12.5L7.5 15L11.5 10" />
    </svg>
  );
}

const TYPE_ICONS: Record<BacklogItemType, React.ReactNode> = {
  Bug:                   <BugAntIcon     width={16} height={16} />,
  Tarea:                 <TaskIcon />,
  Subtarea:              <SubtaskIcon />,
  'Historia de Usuario': <BookOpenIcon   width={16} height={16} />,
  'Épica':               <BoltIcon       width={16} height={16} />,
};

export interface BacklogStatus {
  label: string;
  color: string;
  textColor: string;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

interface PriorityOption {
  value: Priority;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'critical', icon: <ChevronDoubleUpIcon   width={16} height={16} />, label: 'Crítica', color: 'var(--color-mahindra-red)' },
  { value: 'high',     icon: <ChevronUpIcon         width={16} height={16} />, label: 'Alta',    color: '#f97316' },
  { value: 'medium',   icon: <MinusIcon             width={16} height={16} />, label: 'Media',   color: 'var(--color-anchor-gray-1)' },
  { value: 'low',      icon: <ChevronDownIcon       width={16} height={16} />, label: 'Baja',    color: '#3b82f6' },
  { value: 'minimal',  icon: <ChevronDoubleDownIcon width={16} height={16} />, label: 'Mínima',  color: '#1d4ed8' },
];

// ── UserAvatar ────────────────────────────────────────────────────
function UserAvatar({ userId }: { userId: number }) {
  const { avatarSvg } = useUserAvatarSvg(userId);
  return (
    <div className={styles.avatarCircle}>
      {avatarSvg
        ? <div className={styles.avatarSvg} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
        : <UserIcon width={14} height={14} />
      }
    </div>
  );
}

// ── UserPickerOption — one row inside the assignee picker ─────────
function UserPickerOption({ user, displayName }: { user: { id: number }; displayName: string }) {
  const { avatarSvg } = useUserAvatarSvg(user.id);
  return (
    <>
      <div className={styles.avatarCircle}>
        {avatarSvg
          ? <div className={styles.avatarSvg} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
          : <UserIcon width={14} height={14} />
        }
      </div>
      <span className={styles.assigneePickerName}>{displayName}</span>
    </>
  );
}

type OpenDropdown = 'status' | 'priority' | 'menu' | 'assignee' | null;

interface BacklogListItemProps {
  itemId: number;
  code: string;
  title: string;
  status: BacklogStatus;
  statuses?: BacklogStatus[];
  priority?: Priority;
  itemType?: BacklogItemType;
  responsibleUserId?: number;
  users?: { id: number; nombre: string | null; apellido: string | null; email: string }[];
  onAssigneeChange?: (userId: number | null) => void;
  isSuggestion?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onStatusChange?: (status: BacklogStatus) => void;
  onPriorityChange?: (priority: Priority) => void;
  onAssign?: () => void;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAcceptSuggestion?: () => void;
  isLocked?: boolean;
}

const BacklogListItem: React.FC<BacklogListItemProps> = ({
  itemId,
  code,
  title,
  status,
  statuses = [],
  priority = 'medium',
  itemType = 'Tarea',
  responsibleUserId,
  users = [],
  onAssigneeChange,
  isSuggestion = false,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  onStatusChange,
  onPriorityChange,
  onViewDetails,
  onEdit,
  onDelete,
  onAcceptSuggestion,
  isLocked = false,
}) => {
  const [open, setOpen]                       = useState<OpenDropdown>(null);
  const [currentStatus, setCurrentStatus]     = useState<BacklogStatus>(status);
  const [currentPriority, setCurrentPriority] = useState<Priority>(priority ?? 'medium');
  const rowRef = useRef<HTMLDivElement>(null);
  const {
    isSubscribed,
    isLoading: subscriptionLoading,
    isToggling: subscriptionToggling,
    error: subscriptionError,
    canSubscribe,
    toggle: toggleSubscription,
  } = useBacklogItemSubscription(itemId);

  // Close any open dropdown/menu on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentPriorityOption = PRIORITY_OPTIONS.find(o => o.value === currentPriority) ?? PRIORITY_OPTIONS[2];
  const subscriptionMenuDisabled = subscriptionLoading || subscriptionToggling;
  const subscriptionMenuText = isSubscribed ? 'Desuscribirse' : 'Suscribirse';

  const menuItems = isLocked
   ?[ { text: 'Ver Detalles', onClick: () => { setOpen(null); onViewDetails?.(); } }, ]
   :[
    { text: 'Ver Detalles', onClick: () => { setOpen(null); onViewDetails?.(); } },
    { text: 'Editar',       onClick: () => { setOpen(null); onEdit?.();        } },
    ...(isSuggestion && onAcceptSuggestion ? [{ text: 'Aceptar sugerencia', onClick: () => { setOpen(null); onAcceptSuggestion(); } }] : []),
    ...(canSubscribe ? [{
      text: subscriptionToggling ? 'Actualizando...' : subscriptionMenuText,
      title: subscriptionError ?? undefined,
      disabled: subscriptionMenuDisabled,
      onClick: () => {
        if (subscriptionMenuDisabled) return;
        setOpen(null);
        void toggleSubscription();
      },
    }] : []),
    { text: 'Eliminar',     onClick: () => { setOpen(null); onDelete?.();      } },
  ];

  return (
    <div className={`${styles.row} ${!hasChildren ? styles.rowCompact : ''} ${isSuggestion ? styles.rowSuggestion : ''}`} ref={rowRef}>
      {/* Expand toggle — only rendered when item has children */}
      {hasChildren && (
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.toggleBtnVisible}`}
          onClick={onToggle}
          aria-label={isExpanded ? 'Contraer hijos' : 'Expandir hijos'}
        >
          <ChevronDownIcon
            width={12}
            height={12}
            className={`${styles.toggleIcon} ${isExpanded ? styles.toggleIconOpen : ''}`}
          />
        </button>
      )}

      {/* Type icon */}
      <span className={styles.typeIcon} aria-label={itemType}>
        {TYPE_ICONS[itemType]}
      </span>

      {/* Code */}
      <span className={styles.code}>{code}</span>

      {/* Title */}
      <span
        className={`${styles.title} ${onViewDetails ? styles.titleClickable : ''}`}
        data-backlog-title
        onClick={onViewDetails}
      >
        {title}
        {isSuggestion && <span className={styles.suggestionBadge}>Sugerencia</span>}
      </span>

      {/* Status — with dropdown */}
      <div className={styles.statusWrapper}>
        <button
          className={styles.statusBtn}
          style={{ backgroundColor: currentStatus.color, color: currentStatus.textColor }}
          onClick={isLocked ? undefined : () => setOpen(o => o === 'status' ? null : 'status')}
          type="button"
          aria-label={`Estado: ${currentStatus.label}`}
          aria-expanded={open === 'status'}
          disabled={isLocked}
        >
          <span className={styles.statusLabel}>{currentStatus.label}</span>
          {!isLocked && <ChevronDownIcon width={12} height={12} />}
        </button>

        {!isLocked && open === 'status' && statuses.length > 0 && (
          <div className={styles.statusDropdown} role="menu">
            {statuses.map(s => (
              <button
                key={s.label}
                className={`${styles.statusOption} ${s.label === currentStatus.label ? styles.statusOptionActive : ''}`}
                type="button"
                role="menuitem"
                onClick={() => { setCurrentStatus(s); onStatusChange?.(s); setOpen(null); }}
                style={{ backgroundColor: s.color, color: s.textColor }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority — with dropdown */}
      <div className={styles.priorityWrapper}>
        <button
          className={`${styles.iconBtn} ${styles.priorityBtn}`}
          type="button"
          aria-label={`Prioridad: ${currentPriorityOption.label}`}
          aria-expanded={open === 'priority'}
          style={{ color: currentPriorityOption.color, opacity: isLocked ? 0.5 : 1 }}
          onClick={isLocked ? undefined : () => setOpen(o => o === 'priority' ? null : 'priority')}
          disabled={isLocked}
        >
          {currentPriorityOption.icon}
        </button>

        {!isLocked && open === 'priority' && (
          <div className={styles.dropdown} role="menu">
            {PRIORITY_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`${styles.dropdownItem} ${option.value === currentPriority ? styles.dropdownItemActive : ''}`}
                type="button"
                role="menuitem"
                aria-label={option.label}
                style={{ color: option.color }}
                onClick={() => { setCurrentPriority(option.value); onPriorityChange?.(option.value); setOpen(null); }}
              >
                {option.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assignee — click avatar (or empty icon) to open user picker */}
      <div className={styles.assigneeWrapper}>
        {responsibleUserId != null
          ? <button
              type="button"
              className={`${styles.avatarBtn} ${open === 'assignee' ? styles.avatarBtnActive : ''}`}
              onClick={isLocked ? undefined : () => setOpen(o => o === 'assignee' ? null : 'assignee')}
              aria-label="Cambiar responsable"
              aria-expanded={open === 'assignee'}
              disabled={isLocked}
              style={{ opacity: isLocked ? 0.7 : 1, cursor: isLocked ? 'default' : 'pointer' }}
            >
              <UserAvatar userId={responsibleUserId} />
            </button>
          : !isLocked
            ? <button
                type="button"
                className={`${styles.iconBtn} ${open === 'assignee' ? styles.iconBtnActive : ''}`}
                onClick={() => setOpen(o => o === 'assignee' ? null : 'assignee')}
                aria-label="Asignar responsable"
                aria-expanded={open === 'assignee'}
              >
                <UserIcon width={16} height={16} />
              </button>
            : <span className={styles.iconBtn} style={{ opacity: 0.35, cursor: 'default' }}><UserIcon width={16} height={16} /></span>
        }

        {!isLocked && open === 'assignee' && (
          <div className={styles.assigneePickerMenu} role="menu">
            <button
              type="button"
              role="menuitem"
              className={`${styles.assigneePickerItem} ${responsibleUserId == null ? styles.assigneePickerItemActive : ''}`}
              onClick={() => { onAssigneeChange?.(null); setOpen(null); }}
            >
              <div className={styles.avatarCircle} style={{ background: 'var(--color-clarity-gray-2)', color: 'var(--color-anchor-gray-1)' }}>
                <UserIcon width={14} height={14} />
              </div>
              <span className={styles.assigneePickerName}>Sin responsable</span>
            </button>
            {users.map(u => {
              const displayName = [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="menuitem"
                  className={`${styles.assigneePickerItem} ${u.id === responsibleUserId ? styles.assigneePickerItemActive : ''}`}
                  onClick={() => { onAssigneeChange?.(u.id); setOpen(null); }}
                >
                  <UserPickerOption user={u} displayName={displayName} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* More options — context menu */}
      <div className={styles.menuWrapper}>
        <button
          className={`${styles.iconBtn} ${open === 'menu' ? styles.iconBtnActive : ''}`}
          type="button"
          aria-label="Más opciones"
          aria-expanded={open === 'menu'}
          onClick={() => setOpen(o => o === 'menu' ? null : 'menu')}
        >
          <EllipsisVerticalIcon width={16} height={16} />
        </button>

        {open === 'menu' && (
          <div className={styles.contextMenuPopover}>
            <ContextMenu elements={menuItems} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklogListItem;
