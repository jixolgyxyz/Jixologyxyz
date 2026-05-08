import React, { useLayoutEffect, useRef, useState } from 'react';
import { UserIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import styles from './ListUserCard.module.css';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';

export interface Role {
  label: string;
  color: string;
  textColor: string;
}

interface ListUserCardProps {
  userId: number;
  fullName: string;
  roles: Role[];
  email: string;
  avatarSvg?: string;
  onEdit?: (position: { x: number; y: number }) => void;
  onAvatarEnter?: (rect: DOMRect) => void;
  onAvatarLeave?: () => void;
}

const MAX_VISIBLE_ROLES = 5;

const ListUserCard: React.FC<ListUserCardProps> = ({
  userId,
  fullName,
  roles,
  email,
  avatarSvg: avatarSvgProp,
  onEdit,
  onAvatarEnter,
  onAvatarLeave,
}) => {
  const { avatarSvg: dbSvg } = useUserAvatarSvg(userId);
  const avatarSvg = avatarSvgProp ?? dbSvg;

  const rolesContainerRef = useRef<HTMLDivElement>(null);
  const [fittingCount, setFittingCount] = useState(MAX_VISIBLE_ROLES);

  const candidateRoles = roles.slice(0, MAX_VISIBLE_ROLES);
  // Stable key that changes only when the candidate label set changes
  const rolesKey = candidateRoles.map(r => r.label).join('|');

  useLayoutEffect(() => {
    const container = rolesContainerRef.current;
    if (!container || container.offsetWidth === 0) return;

    const containerW = container.offsetWidth;
    const gap = 6;
    // Reserve for the "+N" badge (measured from the DOM if present, else estimate)
    const overflowEl = container.querySelector('[data-type="overflow"]') as HTMLElement | null;
    const overflowReserve = (overflowEl?.offsetWidth ?? 36) + gap;

    const labelEl = container.querySelector('[data-type="label"]') as HTMLElement | null;
    const badgeEls = Array.from(
      container.querySelectorAll('[data-type="badge"]'),
    ) as HTMLElement[];

    let used = labelEl ? labelEl.offsetWidth + gap : 0;
    let count = 0;
    const totalRoles = roles.length;

    for (let i = 0; i < badgeEls.length; i++) {
      const w = badgeEls[i].offsetWidth + gap;
      // If there will still be hidden roles after this badge, we must leave room for "+N".
      // "Hidden after" = true when either more candidates follow OR total exceeds MAX.
      const hiddenAfter = i < badgeEls.length - 1 || totalRoles > MAX_VISIBLE_ROLES;
      const reserve = hiddenAfter ? overflowReserve : 0;

      if (used + w + reserve > containerW) break;
      used += w;
      count++;
    }

    queueMicrotask(() => setFittingCount(count));
  }, [rolesKey, roles.length]);

  const overflowCount = roles.length - fittingCount;

  return (
    <div className={styles.rowContainer}>
    <div className={styles.row}>
      <div
        className={`${styles.avatar}${onAvatarEnter ? ` ${styles.avatarClickable}` : ''}`}
        onMouseEnter={
          onAvatarEnter
            ? (e) => onAvatarEnter((e.currentTarget as HTMLElement).getBoundingClientRect())
            : undefined
        }
        onMouseLeave={onAvatarLeave}
        aria-label={onAvatarEnter ? `Ver perfil de ${fullName}` : undefined}
      >
        {avatarSvg ? (
          <div
            className={styles.avatarSvg}
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
          />
        ) : (
          <UserIcon width={18} height={18} />
        )}
      </div>

      <span className={styles.name}>
        <span className={styles.nameLabel}>nombre completo: </span>
        {fullName}
      </span>

      <div className={styles.spacer} />

      {/* position:relative so that out-of-flow (absolute) hidden badges anchor here */}
      <div className={styles.roles} ref={rolesContainerRef}>
        <span className={styles.rolesLabel} data-type="label">Roles:</span>
        {candidateRoles.map((role, i) => (
          <span
            key={role.label}
            data-type="badge"
            className={styles.badge}
            style={{
              backgroundColor: role.color,
              color: role.textColor,
              // Badges that don't fit are removed from the flex flow but kept
              // in the DOM so the next useLayoutEffect can measure their width.
              ...(i >= fittingCount ? {
                position: 'absolute',
                visibility: 'hidden',
                pointerEvents: 'none',
              } : {}),
            }}
          >
            {role.label}
          </span>
        ))}
        {/* Always rendered so useLayoutEffect can measure its width for the reserve calc */}
        <span
          data-type="overflow"
          className={styles.overflowBadge}
          style={{ visibility: overflowCount > 0 ? 'visible' : 'hidden', pointerEvents: 'none' }}
        >
          +{overflowCount > 0 ? overflowCount : 9}
        </span>
      </div>

      <span className={styles.email}>
        <span className={styles.emailLabel}>Correo: </span>
        <span className={styles.emailValue}>{email}</span>
      </span>

      <button
        type="button"
        className={styles.optionsButton}
        aria-label="Más opciones"
        title="Más opciones"
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onEdit?.({ x: rect.left, y: rect.top + rect.height / 2 });
        }}
      >
        <EllipsisVerticalIcon className={styles.optionsButtonIcon} />
      </button>
    </div>
    </div>
  );
};

export default ListUserCard;
