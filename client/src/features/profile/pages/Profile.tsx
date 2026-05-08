import React, { useEffect, useState } from 'react';
import { GiftIcon } from '@heroicons/react/24/outline';
import './Profile.css';
import ButtonComponent from '@/shared/components/ButtonComponent/ButtonComponent';

import UserCard from '../components/UserCard';
import InventoryCard from '../components/InventoryCard';
import SkeletonUserCard from '../components/SkeletonUserCard';
import SkeletonAvatarTile from '../components/SkeletonAvatarTile';
import { AvatarLootBox } from '../components/AvatarLootBox';
import MessagePopUp from '../../../shared/components/MessagePopUp';
import type { MessagePopUpType } from '../../../shared/components/MessagePopUp';
import { useAvatarCatalog } from '../hooks/useAvatarCatalog';
import { useAvatarFeatures } from '../hooks/useAvatarFeatures';
import { useUserAvatar } from '../hooks/useUserAvatar';
import { useUserProfile } from '@/features/user/services/user.service';
import {
  getOwnProfileEditService,
  updateOwnProfileService,
} from '@/features/profile/services/profileEdit.service';
import { useUser } from '@/core/auth/userContext';
import { useAdminUserEdit } from '@/features/admin/hooks/useAdminUserEdit';

const SKELETON_TILE_COUNT = 10;

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
  const { user: currentUser } = useUser();

  const [showLootbox, setShowLootbox] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [passiveDismissed, setPassiveDismissed] = useState(false);

  const [selfValues, setSelfValues] = useState<SelfProfileFormValues>(emptySelfValues);
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfSaving, setSelfSaving] = useState(false);

  const isOwnProfile = currentUser?.id === userId;
  const isAdmin = currentUser?.idRolGlobal === 1;

  const {
    catalog,
    allElements,
    atributos,
    loading: loadingCatalog,
    error: catalogError,
  } = useAvatarCatalog();

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

  const {
    features,
    mainAvatarSvg,
    handleSelectVariant,
    handleSelectColor,
    handleSelectType,
  } = useAvatarFeatures(
    filteredCatalog ?? {
      styleId: 1,
      styleName: '',
      features: [],
      defaultFeatures: {},
    },
    initialFeatures,
  );

  const editScope: EditScope =
    adminEditMode && isAdmin
      ? 'full'
      : isOwnProfile
        ? 'self'
        : 'none';

  const isSelfEdit = editScope === 'self';
  const isFullEdit = editScope === 'full';
  const canUseFormEdit = isSelfEdit || isFullEdit;

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
        const editable = await getOwnProfileEditService();

        if (cancelled) return;

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
              onOpen={addRandomItem}
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
            formValues={formValues}
            onFieldChange={
              canUseFormEdit
                ? (isFullEdit ? handleAdminChange : handleSelfChange)
                : undefined
            }
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
          <div className="profile-section profile-section--inventory">
            <div className="section-tab">Cosméticos</div>

            <div className="section-body section-body--flush">
              {showInventory ? (
                <InventoryCard
                  catalog={filteredCatalog}
                  features={features}
                  onSelectVariant={handleSelectVariant}
                  onSelectColor={handleSelectColor}
                  onSelectType={handleSelectType}
                />
              ) : (
                <div className="inv-card">
                  <div className="inv-grid">
                    {Array.from({ length: SKELETON_TILE_COUNT }).map((_, i) => (
                      <SkeletonAvatarTile key={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="section-footer">
              <ButtonComponent
                label="Abrir lootbox"
                icon={<GiftIcon width={16} height={16} />}
                variant="secondary"
                onClick={() => { setShowLootbox(true); setPopup(null); }}
                disabled={!canEditAvatar || isLoading || hasError || avatarSaving || addingItem}
              />
              <ButtonComponent
                label={avatarSaving ? 'Guardando…' : 'Guardar avatar'}
                onClick={handleSaveAvatar}
                disabled={!canEditAvatar || !showInventory || avatarSaving || addingItem}
              />
            </div>
          </div>
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