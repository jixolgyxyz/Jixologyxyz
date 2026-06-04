import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import './Profile.css';

import UserCard from '../components/UserCard';
import AvatarInventorySection from '../components/AvatarInventorySection';
import AvatarShop from '../../store/pages'
import SkeletonUserCard from '../components/SkeletonUserCard';
import { AvatarLootBox } from '../components/AvatarLootBox';
import MessagePopUp from '../../../shared/components/MessagePopUp';
import type { MessagePopUpType } from '../../../shared/components/MessagePopUp';
import { useAvatarCatalog } from '../hooks/useAvatarCatalog';
import { fetchUserActiveAvatar } from '../services/avatar.service';
import { useAvatarFeatures } from '../hooks/useAvatarFeatures';
import { useUserAvatar } from '../hooks/useUserAvatar';
import { useUserProfile } from '@/features/user/services/user.service';
import {
  getOwnProfileEditService,
  updateOwnProfileService,
  fetchZonaHorarias,
  fetchOwnGithubConnection,
  buildGithubConnectUrl,
  disconnectGithub,
  type ZonaHorariaOption,
  type GithubUsuarioRecord,
} from '@/features/profile/services/profileEdit.service';
import { useUser } from '@/core/auth/userContext';
import { useAdminUserEdit } from '@/features/admin/hooks/useAdminUserEdit';

import ContextMenu from '@/shared/components/ContextMenu';
import type { MenuComponent } from '@/shared/components/ContextMenu';

function calcAge(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

interface PopupState {
  type: MessagePopUpType;
  title: string;
  message: string;
}

type EditScope = 'none' | 'aboutMe' | 'self' | 'full';

interface SelfProfileFormValues {
  nombre: string;
  apellido: string;
  birthDate: string;
  phone: string;
  email: string;
  aboutMe: string;
  password: string;
  idRolGlobal: string;
  idZonaHoraria: string;
  jornada: string;
}

const emptySelfValues: SelfProfileFormValues = {
  nombre: '',
  apellido: '',
  birthDate: '',
  phone: '',
  email: '',
  aboutMe: '',
  password: '',
  idRolGlobal: '',
  idZonaHoraria: '',
  jornada: '',
};


function ProfileContent({
  userId,
  adminEditMode = false,
}: {
  userId: number;
  adminEditMode?: boolean;
}) {
  const { user: currentUser, refreshUser } = useUser();

  const [showOptions, setShowOptions] = useState(false);
  const [showLootbox, setShowLootbox] = useState(false);
  // Restore from localStorage immediately to avoid a flash of pixelArt on refresh.
  // The DB-dominant style sync below will correct it if localStorage is stale.
  const [selectedStyleId, setSelectedStyleId] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const stored = window.localStorage.getItem(`profile:selectedStyleId:${userId}`);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [passiveDismissed, setPassiveDismissed] = useState(false);

  const [selfValues, setSelfValues] = useState<SelfProfileFormValues>(emptySelfValues);
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfSaving, setSelfSaving] = useState(false);
  const [zonaHorariaOptions, setZonaHorariaOptions] = useState<ZonaHorariaOption[]>([]);

  const isOwnProfile = currentUser?.id === userId;
  const isAdmin = currentUser?.idRolGlobal === 1;

  const {
    catalog,
    allElements,
    atributos,
    styles: avatarStyles,
    loading: loadingCatalog,
    error: catalogError,
  } = useAvatarCatalog(selectedStyleId);

  const {
    userProfile,
    loading: loadingUser,
    error: userError,
    refresh,
  } = useUserProfile(userId);

  const {
    filteredCatalog,
    initialFeatures,
    saveAvatar,
    addRandomItem,
    unownedItems,
    saving: avatarSaving,
    loadingAvatar,
    addingItem,
  } = useUserAvatar(userId, catalog, allElements, atributos);

  const avatarFeatures = useAvatarFeatures(
    filteredCatalog ?? {
      styleId: 1,
      styleName: '',
      features: [],
      defaultFeatures: {},
    },
    initialFeatures,
  );
  
  const {
    features,
    mainAvatarSvg,
    handleSelectVariant,
    handleSelectColor,
    handleSelectType,
  } = avatarFeatures;

  useEffect(() => {
    console.log('filteredCatalog updated', filteredCatalog);
  }, [filteredCatalog]);

  // Persist the selected style across refreshes
  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;
    window.localStorage.setItem(`profile:selectedStyleId:${userId}`, String(selectedStyleId));
  }, [selectedStyleId, userId]);

  // On first load, if there's no stored preference yet, fall back to whichever
  // style the user has actually saved most elements for in the DB.
  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;
    if (window.localStorage.getItem(`profile:selectedStyleId:${userId}`)) return;
    if (allElements.length === 0 || atributos.length === 0) return;

    fetchUserActiveAvatar(userId, allElements, atributos)
      .then(result => {
        if (result?.styleId) setSelectedStyleId(result.styleId);
      })
      .catch(() => { /* keep default */ });
  }, [userId, allElements, atributos]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [githubData, setGithubData]       = useState<GithubUsuarioRecord | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    if (!isOwnProfile) { setGithubLoading(false); return; }
    fetchOwnGithubConnection()
      .then(setGithubData)
      .catch(() => setGithubData(null))
      .finally(() => setGithubLoading(false));
  }, [isOwnProfile]);

  useEffect(() => {
    if (searchParams.get('github') === 'connected') {
      setSearchParams({}, { replace: true });
      fetchOwnGithubConnection().then(setGithubData).catch(() => null);
    }
  }, [searchParams, setSearchParams]);

  const handleGithubConnect = async () => {
    try {
      const url = await buildGithubConnectUrl();
      window.location.href = url;
    } catch {
      setPopup({ type: 'error', title: 'Error', message: 'No se pudo iniciar la conexión con GitHub.' });
    }
  };

  const handleGithubDisconnect = async () => {
    try {
      await disconnectGithub();
      setGithubData(null);
      setShowOptions(false);
    } catch {
      setPopup({ type: 'error', title: 'Error', message: 'No se pudo desconectar GitHub.' });
    }
  };

  const githubMenuItems: MenuComponent[] = [
    { text: 'Desconectar GitHub', onClick: handleGithubDisconnect },
  ];

  const editScope: EditScope =
    adminEditMode && isAdmin
      ? 'full'
      : isOwnProfile
        ? 'self'
        : 'none';

  const isSelfEdit = editScope === 'self';
  const isFullEdit = editScope === 'full';
  const canUseFormEdit = isSelfEdit || isFullEdit;

  //AvatarKey (Refresh)
  const [shopKey, setShopKey] = useState(0);

  const {
    values: adminValues,
    loading: adminLoading,
    saving: adminSaving,
    handleChange: handleAdminChange,
    submit: submitAdminEdit,
  } = useAdminUserEdit(userId, isFullEdit);

  useEffect(() => {
    if (!isSelfEdit) return;

    let cancelled = false;

    const loadSelfEditValues = async () => {
      setSelfLoading(true);

      try {
        const [editable, zonas] = await Promise.all([
          getOwnProfileEditService(),
          fetchZonaHorarias(),
        ]);

        if (cancelled) return;

        setZonaHorariaOptions(zonas);
        setSelfValues((prev) => ({
          ...prev,
          aboutMe: editable.sobre_mi ?? '',
          idZonaHoraria:
            editable.id_zona_horaria === null || editable.id_zona_horaria === undefined
              ? ''
              : String(editable.id_zona_horaria),
          jornada:
            editable.jornada === null || editable.jornada === undefined
              ? ''
              : String(editable.jornada),
        }));
      } catch (err) {
        if (cancelled) return;

        setPopup({
          type: 'error',
          title: 'Error al cargar perfil',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los valores editables del perfil.',
        });
      } finally {
        if (!cancelled) setSelfLoading(false);
      }
    };

    void loadSelfEditValues();

    return () => {
      cancelled = true;
    };
  }, [isSelfEdit, userId]);

  const isLoading =
    loadingCatalog ||
    loadingAvatar ||
    loadingUser ||
    selfLoading ||
    (isFullEdit && adminLoading);

  const hasError = !!(catalogError || userError);
  const isEmpty =
    !isLoading &&
    !hasError &&
    (!filteredCatalog || filteredCatalog.features.length === 0);

  const showInventory =
    !isLoading &&
    !hasError &&
    !!filteredCatalog &&
    filteredCatalog.features.length > 0;

  const canEditAvatar = isOwnProfile;

  const nombre =
    [userProfile?.nombre, userProfile?.apellido].filter(Boolean).join(' ') || '—';
  const email = userProfile?.email ?? '—';
  const telefono = userProfile?.telefono ?? '—';
  const sobreMi = userProfile?.sobreMi ?? '';
  const age = userProfile?.fechaNacimiento
    ? calcAge(userProfile.fechaNacimiento)
    : null;

  const birthDateForDisplay = userProfile?.fechaNacimiento
    ? new Date(userProfile.fechaNacimiento).toLocaleDateString('es-MX')
    : '—';

  const handleSelfChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setSelfValues((prev) => ({ ...prev, [name]: value }));
  };

  const submitSelfEdit = async () => {
    const jornadaNum = toNullableNumber(selfValues.jornada);
    if (jornadaNum !== null && jornadaNum < 0) {
      setPopup({
        type: 'error',
        title: 'Valor inválido',
        message: 'La jornada no puede ser negativa.',
      });
      return;
    }

    setSelfSaving(true);

    try {
      const response = await updateOwnProfileService({
        sobre_mi: selfValues.aboutMe.trim() || null,
        jornada: toNullableNumber(selfValues.jornada),
        id_zona_horaria: toNullableNumber(selfValues.idZonaHoraria),
      });

      const reloaded = await getOwnProfileEditService();

      setSelfValues((prev) => ({
        ...prev,
        aboutMe: reloaded.sobre_mi ?? '',
        idZonaHoraria:
          reloaded.id_zona_horaria === null || reloaded.id_zona_horaria === undefined
            ? ''
            : String(reloaded.id_zona_horaria),
        jornada:
          reloaded.jornada === null || reloaded.jornada === undefined
            ? ''
            : String(reloaded.jornada),
      }));

      await refreshUser();

      setPopup({
        type: 'notification',
        title: 'Perfil actualizado',
        message: response.message || 'Tu perfil se guardó correctamente.',
      });

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el perfil.';

      setPopup({
        type: 'error',
        title: 'Error al guardar',
        message,
      });

      throw err;
    } finally {
      setSelfSaving(false);
    }
  };

  const formValues = isFullEdit
    ? {
        nombre: adminValues.nombre,
        apellido: adminValues.apellido,
        birthDate: adminValues.fecha_nacimiento,
        phone: adminValues.telefono,
        email: adminValues.email,
        aboutMe: adminValues.sobre_mi,
        password: adminValues.password,
        idRolGlobal: adminValues.id_rol_global,
        idZonaHoraria: adminValues.id_zona_horaria,
        jornada: adminValues.jornada,
      }
    : isSelfEdit
      ? selfValues
      : undefined;

  const formSaving = isFullEdit ? adminSaving : selfSaving;

  const handleSaveAvatar = async () => {
    try {
      await saveAvatar(features);
      setPopup({
        type: 'notification',
        title: 'Avatar guardado',
        message: 'Tu avatar se ha guardado correctamente.',
      });
    } catch {
      setPopup({
        type: 'error',
        title: 'Error al guardar',
        message: 'No se pudo guardar el avatar. Intenta de nuevo.',
      });
    }
  };

  const activePopup: PopupState | null =
    popup ??
    (passiveDismissed
      ? null
      : hasError
        ? {
            type: 'error',
            title: 'Error de conexión',
            message:
              'No se pudo conectar a la base de datos. Verifica tu conexión e intenta de nuevo.',
          }
        : isEmpty
          ? {
              type: 'warning',
              title: 'Inventario vacío',
              message:
                'Aún no tienes elementos. Abre una lootbox para obtener tu primer cosmético.',
            }
          : null);
  const [rightPanelMode, setRightPanelMode] = useState<'inventory' | 'shop'>('shop');

  return (
    <>
      {showLootbox && (
        <div
          className="lootbox-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLootbox(false);
          }}
        >
          <div className="lootbox-modal">
          <AvatarLootBox
            unownedItems={unownedItems}
            atributos={atributos}
            baseFeatures={features}
            onOpen={async (item) => {
              await addRandomItem(item);
              setShopKey(prev => prev + 1);
            }}
            onClose={() => setShowLootbox(false)}
            disabled={addingItem}
          />
          </div>
        </div>
      )}
  
      {activePopup && (
        <MessagePopUp
          type={activePopup.type}
          title={activePopup.title}
          message={activePopup.message}
          onClose={() => {
            setPopup(null);
            setPassiveDismissed(true);
          }}
        />
      )}
  
      <div className="profile-page">
        {isLoading ? (
          <SkeletonUserCard />
        ) : (
          <UserCard
            userId={userId}
            avatarSvg={mainAvatarSvg}
            name={nombre}
            age={age ?? 0}
            birthDate={birthDateForDisplay}
            phone={telefono}
            email={email}
            aboutMe={sobreMi}
            editScope={editScope}
            saving={formSaving}
            onEditAvatar={canEditAvatar ? () => setRightPanelMode('inventory') : undefined}
            formValues={formValues}
            onFieldChange={
              canUseFormEdit
                ? (isFullEdit ? handleAdminChange : handleSelfChange)
                : undefined
            }
            zonaHorariaOptions={zonaHorariaOptions}
            onSubmitFullEdit={
              canUseFormEdit
                ? async () => {
                    try {
                      if (isFullEdit) {
                        const response = await submitAdminEdit();
  
                        setPopup({
                          type: 'notification',
                          title: 'Usuario actualizado',
                          message:
                            response?.message || 'El usuario se guardó correctamente.',
                        });
                      } else {
                        await submitSelfEdit();
                      }
                      await refresh();
                    } catch (err) {
                      if (isFullEdit) {
                        const message =
                          err instanceof Error
                            ? err.message
                            : 'No se pudo actualizar el usuario.';
                        setPopup({
                          type: 'error',
                          title: 'Error al guardar',
                          message,
                        });
                      }
                      throw err;
                    }
                  }
                : undefined
            }
          />
        )}
        <div className="profile-right">
          {isOwnProfile && rightPanelMode !== 'inventory' && (
            <div className="profile-section profile-section--github">
              {githubData && (
                <div
                  style={{ position: 'absolute', top: 15, right: 20 }}
                  onMouseEnter={() => setShowOptions(true)}
                  onMouseLeave={() => setShowOptions(false)}
                >
                  <EllipsisVerticalIcon width={20} height={20} style={{ cursor: 'pointer' }} />
                  {showOptions && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50 }}>
                      <ContextMenu elements={githubMenuItems} />
                    </div>
                  )}
                </div>
              )}
              <span className="section-tab">GitHub</span>
              <div className="section-body github-body">
                {githubLoading ? (
                  <div className="github-skeleton" />
                ) : githubData ? (
                  <div className="github-connected">
                    <img
                      className="github-avatar"
                      src={githubData.github_avatar_url ?? ''}
                      alt={githubData.github_username}
                    />
  
                    <div className="github-info">
                      <span className="github-username">
                        @{githubData.github_username}
                      </span>
  
                      <span className="github-since">
                        Conectado el{' '}
                        {new Date(githubData.connected_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    <div className="github-badges">
                      <span className="github-badge">Conectado</span>
                    </div>
                  </div>
                ) : (
                  <div className="github-disconnected">
                    <p className="github-desc">
                      Conecta tu cuenta de GitHub para integrar tus repos y orgs directamente en Jixology.
                    </p>
  
                    <button
                      type="button"
                      className="github-connect-btn"
                      onClick={handleGithubConnect}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      Conectar con GitHub
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
  

  
          {rightPanelMode === 'inventory' ? (
            <AvatarInventorySection
              key={shopKey}
              showInventory={showInventory}
              filteredCatalog={filteredCatalog}
              features={features}
              onSelectVariant={handleSelectVariant}
              onSelectColor={handleSelectColor}
              onSelectType={handleSelectType}
              avatarSaving={avatarSaving}
              handleSaveAvatar={handleSaveAvatar}
              canEditAvatar={canEditAvatar}
              addingItem={addingItem}
              onClose={() => setRightPanelMode('shop')}
              styles={avatarStyles}
              selectedStyleId={selectedStyleId}
              onStyleChange={setSelectedStyleId}
            />
          ) : (
            <AvatarShop
              key={`${shopKey}-${selectedStyleId}`}
              styleId={selectedStyleId}
              onStyleChange={setSelectedStyleId}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ProfileWithAuth() {
  const { user } = useUser();
  return <ProfileContent userId={user?.id ?? 0} />;
}

const Profile: React.FC<{ debugUserId?: number; adminEditMode?: boolean }> = ({
  debugUserId,
  adminEditMode = false,
}) => {
  if (debugUserId !== undefined) {
    return <ProfileContent userId={debugUserId} adminEditMode={adminEditMode} />;
  }

  return <ProfileWithAuth />;
};

export default Profile;