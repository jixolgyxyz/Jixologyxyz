import React, { useEffect, useState } from 'react';
import {
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import styles from './UserCard.module.css';
import { useUserAvatarSvg } from '../../hooks/useUserAvatarSvg';

export interface UserCardEditValues {
  nombre: string;
  apellido: string;
  birthDate: string;
  phone: string;
  email: string;
  aboutMe: string;
  password?: string;
  idRolGlobal?: string;
  idZonaHoraria?: string;
  jornada?: string;
}

type EditScope = 'none' | 'aboutMe' | 'self' | 'full';

interface UserCardProps {
  userId: number;
  avatarSvg?: string;
  name: string;
  age: number;
  birthDate: string;
  phone: string;
  email: string;
  aboutMe: string;
  editScope?: EditScope;
  saving?: boolean;
  onSaveAboutMe?: (sobreMi: string) => Promise<void>;
  onSubmitFullEdit?: () => Promise<void>;
  formValues?: UserCardEditValues;
  onFieldChange?: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  userId,
  avatarSvg: avatarSvgProp,
  name,
  age,
  birthDate,
  phone,
  email,
  aboutMe,
  editScope = 'none',
  saving = false,
  onSaveAboutMe,
  onSubmitFullEdit,
  formValues,
  onFieldChange,
}) => {
  const { avatarSvg: dbSvg } = useUserAvatarSvg(userId);
  const avatarSvg = avatarSvgProp ?? dbSvg;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(aboutMe);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(aboutMe);
  }, [aboutMe]);

  const handleSaveAboutMe = async () => {
    if (!onSaveAboutMe) return;
    setSaveError(null);

    try {
      await onSaveAboutMe(draft);
      setIsEditing(false);
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.');
    }
  };

  const handleSaveForm = async () => {
    if (!onSubmitFullEdit) return;
    setSaveError(null);

    try {
      await onSubmitFullEdit();
      setIsEditing(false);
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.');
    }
  };

  const handleCancel = () => {
    setDraft(aboutMe);
    setSaveError(null);
    setIsEditing(false);
  };

  const isSelfEdit = editScope === 'self';
  const isFullEdit = editScope === 'full';
  const isAboutMeOnly = editScope === 'aboutMe';
  const isPreviewOnly = editScope === 'none';

  return (
    <div
      className={`${styles.profileCard} ${
        isPreviewOnly ? styles.profileCardPreview : ''
      }`}
    >
      {editScope !== 'none' && !isEditing && (
        <button
          className={styles.editCardBtn}
          onClick={() => setIsEditing(true)}
          type="button"
          aria-label="Editar perfil"
        >
          <PencilSquareIcon width={16} height={16} />
        </button>
      )}

      <div className={styles.avatarWrapper}>
        <div
          className={styles.avatarCircle}
          dangerouslySetInnerHTML={{ __html: avatarSvg }}
        />
      </div>

      {(isSelfEdit || isFullEdit) && isEditing && formValues && onFieldChange ? (
        <>
          {isSelfEdit && (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <span>Nombre: {name}</span>
              </div>
              <div className={styles.infoRow}>
                <span>Edad: {age}</span>
              </div>
              <div className={styles.infoRow}>
                <span>Fecha de nacimiento: {birthDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span>Teléfono: {phone}</span>
              </div>
              <div className={styles.infoRow}>
                <span>Correo: {email}</span>
              </div>
            </div>
          )}

          {isFullEdit && (
            <div className={styles.formGrid}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Nombre</span>
                <input
                  className={styles.inputField}
                  name="nombre"
                  value={formValues.nombre}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Apellido</span>
                <input
                  className={styles.inputField}
                  name="apellido"
                  value={formValues.apellido}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Fecha de nacimiento</span>
                <input
                  className={styles.inputField}
                  type="date"
                  name="fecha_nacimiento"
                  value={formValues.birthDate}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Teléfono</span>
                <input
                  className={styles.inputField}
                  name="telefono"
                  value={formValues.phone}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Correo</span>
                <input
                  className={styles.inputField}
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Nueva contraseña</span>
                <input
                  className={styles.inputField}
                  type="password"
                  name="password"
                  value={formValues.password ?? ''}
                  onChange={onFieldChange}
                  placeholder="Déjala vacía si no la cambiarás"
                />
                <span className={styles.fieldHint}>
                  Solo se actualiza si escribes una nueva.
                </span>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Rol global</span>
                <input
                  className={styles.inputField}
                  name="id_rol_global"
                  value={formValues.idRolGlobal ?? ''}
                  onChange={onFieldChange}
                />
              </label>
            </div>
          )}

          <div className={styles.aboutMeSection}>
            <div className={styles.aboutMeLabel}>Sobre mí</div>
            <textarea
              className={styles.aboutMeTextarea}
              name={isFullEdit ? 'sobre_mi' : 'aboutMe'}
              value={formValues.aboutMe}
              onChange={onFieldChange}
              rows={5}
              disabled={saving}
            />
          </div>

          {isSelfEdit && (
            <div className={styles.formGrid}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Zona horaria</span>
                <input
                  className={styles.inputField}
                  name="idZonaHoraria"
                  value={formValues.idZonaHoraria ?? ''}
                  onChange={onFieldChange}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Jornada</span>
                <input
                  className={styles.inputField}
                  name="jornada"
                  value={formValues.jornada ?? ''}
                  onChange={onFieldChange}
                />
              </label>
            </div>
          )}

          {saveError && <p className={styles.saveError}>{saveError}</p>}

          <div className={styles.editActions}>
            <button
              className={styles.saveBtn}
              onClick={handleSaveForm}
              disabled={saving}
              type="button"
            >
              <CheckIcon width={14} height={14} />
              {saving ? 'Guardando…' : 'Guardar'}
            </button>

            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={saving}
              type="button"
            >
              <XMarkIcon width={14} height={14} />
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          {isPreviewOnly ? (
            <>
              <div className={styles.profileInfo}>
                <div className={styles.infoRow}>
                  <span>Nombre: {name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span>Correo: {email}</span>
                </div>
              </div>

              <div className={styles.aboutMeSection}>
                <div className={styles.aboutMeLabel}>Sobre mí</div>
                <p className={styles.aboutMeText}>{aboutMe || '—'}</p>
              </div>
            </>
          ) : (
            <>
              <div className={styles.profileInfo}>
                <div className={styles.infoRow}>
                  <span>Nombre: {name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span>Edad: {age}</span>
                </div>
                <div className={styles.infoRow}>
                  <span>Fecha de nacimiento: {birthDate}</span>
                </div>
                <div className={styles.infoRow}>
                  <span>Teléfono: {phone}</span>
                </div>
                <div className={styles.infoRow}>
                  <span>Correo: {email}</span>
                </div>
              </div>

              <div className={styles.aboutMeSection}>
                <div className={styles.aboutMeLabel}>Sobre mí</div>

                {isAboutMeOnly && isEditing ? (
                  <>
                    <textarea
                      className={styles.aboutMeTextarea}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={5}
                      disabled={saving}
                      autoFocus
                    />
                    {saveError && <p className={styles.saveError}>{saveError}</p>}
                    <div className={styles.editActions}>
                      <button
                        className={styles.saveBtn}
                        onClick={handleSaveAboutMe}
                        disabled={saving}
                        type="button"
                      >
                        <CheckIcon width={14} height={14} />
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>

                      <button
                        className={styles.cancelBtn}
                        onClick={handleCancel}
                        disabled={saving}
                        type="button"
                      >
                        <XMarkIcon width={14} height={14} />
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={styles.aboutMeText}>{aboutMe || '—'}</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserCard;