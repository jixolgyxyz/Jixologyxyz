import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import FormPopUp from '@/shared/components/FormPopUp';
import { RegisterUserForm } from '../../components/registerUserForm';
import { useRegisterUser } from '../../hooks/useRegisterUser';
import { useRegisterUserOptions } from '../../hooks/useUserOptions';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import type { AdminUserRoleBadge } from '../../types/admin.types';
import FilterBar from '@/shared/components/FilterBar';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';
import ListUserCard from '@/shared/components/ListUserCard';
import UserCard from '@/features/profile/components/UserCard/UserCard';
import { useUserProfile } from '@/features/user/services/user.service';
import ContextMenu, { type MenuComponent } from '@/shared/components/ContextMenu';
import { setAdminUserActiveService } from '../../services/adminUserStatus.service';
import './adminPage.css';

function calcAge(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const POPUP_WIDTH = 298;
const POPUP_HEIGHT = 500;

function computePopoverStyle(rect: DOMRect): React.CSSProperties {
  const GAP = 16;
  const MARGIN = 8;

  let left = rect.right + GAP;
  if (left + POPUP_WIDTH > window.innerWidth) {
    left = rect.left - POPUP_WIDTH - GAP;
  }

  let top = rect.top;
  if (top + POPUP_HEIGHT > window.innerHeight - MARGIN) {
    top = window.innerHeight - POPUP_HEIGHT - MARGIN;
  }
  if (top < MARGIN) {
    top = MARGIN;
  }

  return { position: 'fixed', left, top, zIndex: 1001 };
}

function computeContextMenuStyle(position: { x: number; y: number }): React.CSSProperties {
  const MARGIN = 8;
  const MENU_WIDTH = 190;
  const MENU_HEIGHT = 110;
  const HORIZONTAL_OFFSET = 170;
  const VERTICAL_OFFSET = 8;

  let left = position.x - HORIZONTAL_OFFSET;
  let top = position.y - VERTICAL_OFFSET;

  if (left + MENU_WIDTH > window.innerWidth - MARGIN) {
    left = window.innerWidth - MENU_WIDTH - MARGIN;
  }

  if (top + MENU_HEIGHT > window.innerHeight - MARGIN) {
    top = window.innerHeight - MENU_HEIGHT - MARGIN;
  }

  if (left < MARGIN) left = MARGIN;
  if (top < MARGIN) top = MARGIN;

  return {
    position: 'fixed',
    left,
    top,
    zIndex: 1100,
  };
}

const AVATAR_ONLY_HEIGHT = 210;
const FULL_CARD_HEIGHT = 560;

function UserProfileModal({
  userId,
  rect,
  onMouseEnter,
  onMouseLeave,
}: {
  userId: number;
  rect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { userProfile, loading } = useUserProfile(userId);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setExpanded(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const nombre =
    [userProfile?.nombre, userProfile?.apellido].filter(Boolean).join(' ') || '—';
  const email = userProfile?.email ?? '—';
  const telefono = userProfile?.telefono ?? '—';
  const sobreMi = userProfile?.sobreMi ?? '';
  const age = userProfile?.fechaNacimiento ? calcAge(userProfile.fechaNacimiento) : 0;
  const birthDate = userProfile?.fechaNacimiento
    ? new Date(userProfile.fechaNacimiento).toLocaleDateString('es-MX')
    : '—';

  return (
    <div
      style={{
        ...computePopoverStyle(rect),
        borderRadius: '20px',
        border: '1px solid rgba(31, 54, 80, 0.12)',
        boxShadow:
          '0 8px 32px rgba(10, 8, 56, 0.16), 0 2px 8px rgba(10, 8, 56, 0.08)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? `${FULL_CARD_HEIGHT}px` : `${AVATAR_ONLY_HEIGHT}px`,
          transition: 'max-height 1s cubic-bezier(0.34, 1.1, 0.64, 1)',
          borderRadius: '20px',
        }}
      >
        {loading ? (
          <p
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--color-anchor-gray-1)',
            }}
          >
            Cargando...
          </p>
        ) : (
          <UserCard
            userId={userId}
            name={nombre}
            age={age}
            birthDate={birthDate}
            phone={telefono}
            email={email}
            aboutMe={sobreMi}
          />
        )}
      </div>
    </div>
  );
}

function getRoleBadge(idRolGlobal: number): AdminUserRoleBadge[] {
  if (idRolGlobal === 1) {
    return [
      {
        label: 'Administrador',
        color: 'rgba(221, 0, 49, 0.12)',
        textColor: 'var(--color-mahindra-red)',
      },
    ];
  }

  return [
    {
      label: 'Usuario',
      color: 'rgba(31, 54, 80, 0.10)',
      textColor: 'var(--color-blueprint-navy)',
    },
  ];
}

function getStatusBadge(activo: boolean): AdminUserRoleBadge[] {
  return activo
    ? [
        {
          label: 'Activo',
          color: 'rgba(31, 54, 80, 0.10)',
          textColor: 'var(--color-blueprint-navy)',
        },
      ]
    : [
        {
          label: 'Inactivo',
          color: 'rgba(221, 0, 49, 0.12)',
          textColor: 'var(--color-mahindra-red)',
        },
      ];
}

export default function RegisterUserPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pageSuccess, setPageSuccess] = useState('');
  const [pageError, setPageError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [selectedUser, setSelectedUser] = useState<{ userId: number; rect: DOMRect } | null>(
    null
  );
  const [openUserMenu, setOpenUserMenu] = useState<{
    userId: number;
    position: { x: number; y: number };
  } | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setSelectedUser(null), 150);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenUserMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu);
    window.addEventListener('resize', closeMenu);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu);
      window.removeEventListener('resize', closeMenu);
    };
  }, []);

  const { users, loading: usersLoading, error: usersError, refreshUsers } =
    useAdminUsers(search, statusFilter);

  const { values, loading, error, success, handleChange, submit, resetForm } = useRegisterUser();

  const {
    roles,
    zonasHorarias,
    loading: optionsLoading,
    error: optionsError,
  } = useRegisterUserOptions();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await submit();
    setPageSuccess(response.message || 'Usuario creado correctamente.');
    setPageError('');
    setIsCreateModalOpen(false);
    await refreshUsers();
  };

  const handleToggleUserActive = async (
    userId: number,
    activo: boolean,
    fullName: string
  ) => {
    const confirmed = window.confirm(
      activo
        ? `¿Seguro que quieres reactivar a ${fullName}?`
        : `¿Seguro que quieres desactivar a ${fullName}?`
    );

    if (!confirmed) return;

    try {
      const response = await setAdminUserActiveService(userId, activo);
      setPageSuccess(
        response.message ||
          (activo
            ? 'Usuario reactivado correctamente.'
            : 'Usuario desactivado correctamente.')
      );
      setPageError('');
      setOpenUserMenu(null);
      await refreshUsers();
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : activo
            ? 'No se pudo reactivar el usuario.'
            : 'No se pudo desactivar el usuario.'
      );
    }
  };

  const userCards = users.map((user) => {
    const fullName =
      [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre';

    return (
      <ListUserCard
        key={user.id}
        userId={user.id}
        fullName={fullName}
        roles={[...getRoleBadge(user.id_rol_global), ...getStatusBadge(user.activo)]}
        email={user.email}
        spread
        onEdit={(position) => {
          setOpenUserMenu((prev) =>
            prev?.userId === user.id ? null : { userId: user.id, position }
          );
        }}
        onAvatarEnter={(rect) => {
          cancelHide();
          setSelectedUser({ userId: user.id, rect });
        }}
        onAvatarLeave={startHide}
      />
    );
  });

  const userMenuElements: MenuComponent[] | undefined = openUserMenu
    ? (() => {
        const user = users.find((u) => u.id === openUserMenu.userId);
        const fullName =
          [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim() ||
          'este usuario';

        return [
          {
            text: 'Editar perfil',
            onClick: () => {
              navigate(`/usuarios/${openUserMenu.userId}`);
              setOpenUserMenu(null);
            },
          },
          {
            text: user?.activo ? 'Desactivar usuario' : 'Reactivar usuario',
            onClick: () => {
              void handleToggleUserActive(
                openUserMenu.userId,
                !(user?.activo ?? true),
                fullName
              );
            },
          },
        ];
      })()
    : undefined;

  return (
    <main className="admin-page">
      <div className="admin-page__container">
        <section className="admin-page__card">
          <div className="admin-page__topbar">
            <div className="admin-page__heading">
              <h1 className="admin-page__title">Usuarios del sistema</h1>
              <p className="admin-page__subtitle"></p>
            </div>
          </div>

          <div className="admin-page__search">
            <FilterBar
              searchPlaceholder="Buscar usuario por nombre o correo..."
              searchHeight="2.5rem"
              searchFontSize="0.95rem"
              onSearchChange={setSearch}
              filters={[
                { id: 'active', label: 'Usuarios activos' },
                { id: 'inactive', label: 'Usuarios inactivos' },
              ]}
              activeFilter={statusFilter === 'all' ? null : statusFilter}
              onFilterChange={(id: string | number | null) =>
                setStatusFilter(id === null ? 'all' : (id as 'active' | 'inactive'))
              }
              allLabel="Todos"
            >
              <ButtonComponent
                label="Crear usuario"
                icon={<PlusIcon width={16} height={16} />}
                onClick={() => {
                  setPageError('');
                  setPageSuccess('');
                  setIsCreateModalOpen(true);
                }}
              />
            </FilterBar>
          </div>

          {pageSuccess && (
            <div
              className="admin-page__feedback admin-page__feedback--success"
              onAnimationEnd={() => setPageSuccess('')}
            >
              {pageSuccess}
            </div>
          )}

          {(pageError || usersError) && (
            <div className="admin-page__feedback admin-page__feedback--error">
              {pageError || usersError}
            </div>
          )}

          <div className="admin-page__results-info">Mostrando máximo 10 usuarios</div>

          <div className="admin-page__list">
            {usersLoading ? (
              <div className="admin-page__empty-state">Cargando usuarios...</div>
            ) : userCards.length > 0 ? (
              userCards
            ) : (
              <div className="admin-page__empty-state">No se encontraron usuarios.</div>
            )}
          </div>
        </section>
      </div>

      {openUserMenu && (
        <div
          style={computeContextMenuStyle(openUserMenu.position)}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenu elements={userMenuElements} />
        </div>
      )}

      {selectedUser !== null && (
        <UserProfileModal
          userId={selectedUser.userId}
          rect={selectedUser.rect}
          onMouseEnter={cancelHide}
          onMouseLeave={startHide}
        />
      )}

      <FormPopUp
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
        eyebrow="Usuarios"
        title="Crear usuario"
        subtitle="Captura primero los datos obligatorios y completa el resto solo si lo necesitas."
      >
        <RegisterUserForm
          values={values}
          loading={loading}
          error={error}
          success={success}
          zonaHorariaOptions={zonasHorarias}
          rolOptions={roles}
          optionsLoading={optionsLoading}
          optionsError={optionsError}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </FormPopUp>
    </main>
  );
}