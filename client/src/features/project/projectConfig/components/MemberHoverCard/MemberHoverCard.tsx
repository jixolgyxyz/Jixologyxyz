import React from 'react';
import type { Role } from '@/shared/components/ListUserCard';
import UserCard from '@/features/profile/components/UserCard/UserCard';
import { useUserProfile } from '@/features/user/services/user.service';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 430;

function computeStyle(rect: DOMRect): React.CSSProperties {
  const GAP = 14;
  const MARGIN = 8;

  let left = rect.right + GAP;
  if (left + CARD_WIDTH > window.innerWidth) left = rect.left - CARD_WIDTH - GAP;

  let top = rect.top;
  if (top + CARD_HEIGHT > window.innerHeight - MARGIN) top = window.innerHeight - CARD_HEIGHT - MARGIN;
  if (top < MARGIN) top = MARGIN;

  return { position: 'fixed', left, top, zIndex: 1200 };
}

interface MemberHoverCardProps {
  userId: number;
  name: string;
  email: string;
  roles: Role[];
  rect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function MemberHoverCard({ userId, name, email, roles, rect, onMouseEnter, onMouseLeave }: MemberHoverCardProps) {
  const { userProfile, loading } = useUserProfile(userId);

  return (
    <div
      style={{
        ...computeStyle(rect),
        width: `${CARD_WIDTH}px`,
        borderRadius: '1.25rem',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(10, 8, 56, 0.16), 0 2px 8px rgba(10, 8, 56, 0.08)',
        border: '1px solid rgba(31, 54, 80, 0.1)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading ? (
        <p style={{ margin: 0, padding: '2rem', textAlign: 'center', background: 'var(--color-white)', color: 'var(--color-anchor-gray-1)', fontSize: '0.875rem' }}>
          Cargando...
        </p>
      ) : (
        <>
          <UserCard
            userId={userId}
            name={name}
            age={0}
            birthDate=""
            phone={userProfile?.telefono ?? ''}
            email={email}
            aboutMe={userProfile?.sobreMi ?? ''}
            editScope="none"
          />
          {roles.length > 0 && (
            <div style={{ background: 'var(--color-white)', padding: '0.625rem 1.125rem 0.875rem', borderTop: '1px solid rgba(31, 54, 80, 0.08)' }}>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-blueprint-navy)' }}>
                Roles en el proyecto
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {roles.map(role => (
                  <span
                    key={role.label}
                    style={{ backgroundColor: role.color, color: role.textColor, padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {role.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
