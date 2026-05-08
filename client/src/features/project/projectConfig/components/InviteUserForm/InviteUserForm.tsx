import React, { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import FormPopUp from '@/shared/components/FormPopUp';
import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import {
  fetchAvailableUsers,
  sendInvitation,
  type AvailableProjectUserRecord,
} from '../../services/projectConfig.service';
import styles from './InviteUserForm.module.css';

interface InviteUserFormProps {
  projectId: number;
  invitadorId: number;
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void;
  onError: (message: string) => void;
}

function InviteUserRow({
  user,
  isSending,
  onInvite,
}: {
  user: AvailableProjectUserRecord;
  isSending: boolean;
  onInvite: (user: AvailableProjectUserRecord) => void;
}) {
  const { avatarSvg } = useUserAvatarSvg(user.id);
  const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ') || '—';

  return (
    <div className={styles.userRow}>
      <div className={styles.userInfo}>
        <div className={styles.avatarWrapper}>
          {avatarSvg ? (
            <div
              className={styles.avatarSvg}
              dangerouslySetInnerHTML={{ __html: avatarSvg }}
            />
          ) : (
            <UserCircleIcon className={styles.avatarFallback} />
          )}
        </div>

        <div className={styles.userText}>
          <span className={styles.userName}>{fullName}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.inviteBtn} ${user.yaInvitado ? styles.invitedBtn : ''}`}
        onClick={() => onInvite(user)}
        disabled={user.yaInvitado || isSending}
      >
        {isSending ? (
          'Enviando...'
        ) : user.yaInvitado ? (
          'Invitado'
        ) : (
          <>
            <UserPlusIcon width={14} height={14} />
            Invitar
          </>
        )}
      </button>
    </div>
  );
}

const InviteUserForm: React.FC<InviteUserFormProps> = ({
  projectId,
  invitadorId,
  isOpen,
  onClose,
  onInvited,
  onError,
}) => {
  const [users, setUsers] = useState<AvailableProjectUserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingUsers(true);
    setSearch('');

    fetchAvailableUsers(projectId)
      .then(setUsers)
      .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingUsers(false));
  }, [isOpen, projectId, onError]);

  const filtered = users.filter((u) => {
    const name = [u.nombre, u.apellido].filter(Boolean).join(' ').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleInvite = async (user: AvailableProjectUserRecord) => {
    setSending(user.id);

    try {
      await sendInvitation(user.id, projectId, invitadorId);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                yaInvitado: true,
              }
            : u,
        ),
      );

      onInvited?.();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(null);
    }
  };

  return (
    <FormPopUp
      eyebrow="Configuración"
      title="Invitar usuario"
      subtitle="Busca usuarios activos y envíales una invitación para unirse al proyecto."
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className={styles.content}>
        <div className={styles.searchWrapper}>
          <MagnifyingGlassIcon className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.list}>
          {loadingUsers ? (
            <p className={styles.empty}>Cargando usuarios...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>
              {search
                ? 'No se encontraron usuarios.'
                : 'Todos los usuarios activos ya son miembros o ya fueron invitados.'}
            </p>
          ) : (
            filtered.map((user) => (
              <InviteUserRow
                key={user.id}
                user={user}
                isSending={sending === user.id}
                onInvite={handleInvite}
              />
            ))
          )}
        </div>
      </div>
    </FormPopUp>
  );
};

export default InviteUserForm;