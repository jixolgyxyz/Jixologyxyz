import { useState } from 'react';
import type { RegisterUserFormValues } from '../../types/admin.types';
import { Select } from '@/shared/components/Select/Select';
import { DatePicker } from '@/shared/components/DatePicker/DatePicker';
import './registerUserForm.css';

// Age constraints for the birth date picker
const _today = new Date();
_today.setHours(0, 0, 0, 0);
const _pad = (n: number) => String(n).padStart(2, '0');
const _iso = (d: Date) => `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`;
const MAX_BIRTH_DATE = _iso(new Date(_today.getFullYear() - 18, _today.getMonth(), _today.getDate()));
const MIN_BIRTH_DATE = _iso(new Date(_today.getFullYear() - 80, _today.getMonth(), _today.getDate()));

type SelectOption = {
  id: number;
  label: string;
};

type Props = {
  values: RegisterUserFormValues;
  loading: boolean;
  error: string;
  success: string;
  zonaHorariaOptions: SelectOption[];
  rolOptions: SelectOption[];
  optionsLoading?: boolean;
  optionsError?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

type TouchedFields = {
  email: boolean;
  password: boolean;
  id_zona_horaria: boolean;
  id_rol_global: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function RegisterUserForm({
  values,
  loading,
  error,
  success,
  zonaHorariaOptions = [],
  rolOptions = [],
  optionsLoading = false,
  optionsError = '',
  onChange,
  onSubmit,
}: Props) {
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({
    email: false,
    password: false,
    id_zona_horaria: false,
    id_rol_global: false,
  });

  const isEmailValid = EMAIL_REGEX.test(values.email.trim());
  const isPasswordValid = values.password.trim().length >= MIN_PASSWORD_LENGTH;
  const hasZonaHoraria = values.id_zona_horaria.trim() !== '';
  const hasRol = values.id_rol_global.trim() !== '';

  const canSubmit =
    isEmailValid &&
    isPasswordValid &&
    hasZonaHoraria &&
    hasRol &&
    !loading &&
    !optionsLoading &&
    zonaHorariaOptions.length > 0 &&
    rolOptions.length > 0;

  const handleBlur = (field: keyof TouchedFields) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!canSubmit) {
      e.preventDefault();
      setTouchedFields({
        email: true,
        password: true,
        id_zona_horaria: true,
        id_rol_global: true,
      });
      return;
    }

    onSubmit(e);
  };

  return (
    <form className="register-user-card__form" onSubmit={handleFormSubmit} noValidate>
            <fieldset className="register-user-card__section">
              <div className="register-user-card__section-header">
                <h2 className="register-user-card__section-title">Datos obligatorios <span style={{ color: 'red' }}>*</span></h2>
                <p className="register-user-card__section-description">
                  Estos campos deben estar completos para habilitar la creación del usuario.
                </p>
              </div>

              <div className="register-user-card__compact-grid">
                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="email">
                    Correo electrónico <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    id="email"
                    className="register-user-card__control"
                    name="email"
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={values.email}
                    onChange={onChange}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={touchedFields.email && !isEmailValid}
                  />
                  {touchedFields.email && !isEmailValid ? (
                    <p className="register-user-card__error">
                      Ingresa un correo electrónico válido.
                    </p>
                  ) : null}
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="password">
                    Contraseña <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    id="password"
                    className="register-user-card__control"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={values.password}
                    onChange={onChange}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={touchedFields.password && !isPasswordValid}
                  />
                  {touchedFields.password && !isPasswordValid ? (
                    <p className="register-user-card__error">
                      La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.
                    </p>
                  ) : null}
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label">
                    Zona horaria <span style={{ color: 'red' }}>*</span>
                  </label>
                  <Select
                    options={zonaHorariaOptions.map(z => ({ value: String(z.id), label: z.label }))}
                    value={values.id_zona_horaria}
                    onChange={(v) => {
                      handleBlur('id_zona_horaria');
                      onChange({ target: { name: 'id_zona_horaria', value: v } } as React.ChangeEvent<HTMLSelectElement>);
                    }}
                    placeholder={optionsLoading ? 'Cargando…' : 'Selecciona zona horaria'}
                    emptyLabel="Selecciona zona horaria"
                    hasError={touchedFields.id_zona_horaria && !hasZonaHoraria}
                    disabled={loading || optionsLoading}
                    searchable
                    required
                    maxVisibleItems={3}
                  />
                  {touchedFields.id_zona_horaria && !hasZonaHoraria ? (
                    <p className="register-user-card__error">
                      Selecciona una zona horaria.
                    </p>
                  ) : null}
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label">
                    Rol <span style={{ color: 'red' }}>*</span>
                  </label>
                  <Select
                    options={rolOptions.map(r => ({ value: String(r.id), label: r.label }))}
                    value={values.id_rol_global}
                    onChange={(v) => {
                      handleBlur('id_rol_global');
                      onChange({ target: { name: 'id_rol_global', value: v } } as React.ChangeEvent<HTMLSelectElement>);
                    }}
                    placeholder={optionsLoading ? 'Cargando…' : 'Selecciona rol'}
                    emptyLabel="Selecciona rol"
                    hasError={touchedFields.id_rol_global && !hasRol}
                    disabled={loading || optionsLoading}
                    required
                  />
                  {touchedFields.id_rol_global && !hasRol ? (
                    <p className="register-user-card__error">
                      Selecciona un rol.
                    </p>
                  ) : null}
                </div>
              </div>
            </fieldset>

            <fieldset className="register-user-card__section">
              <div className="register-user-card__section-header">
                <h2 className="register-user-card__section-title">Información opcional</h2>
                <p className="register-user-card__section-description">
                  Estos campos complementan el perfil del usuario.
                </p>
              </div>

              <div className="register-user-card__grid">
                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="telefono">
                    Teléfono
                  </label>
                  <input
                    id="telefono"
                    className="register-user-card__control"
                    name="telefono"
                    type="text"
                    placeholder="Teléfono"
                    value={values.telefono}
                    onChange={onChange}
                  />
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="nombre">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    className="register-user-card__control"
                    name="nombre"
                    type="text"
                    placeholder="Nombre"
                    value={values.nombre}
                    onChange={onChange}
                  />
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="apellido">
                    Apellido
                  </label>
                  <input
                    id="apellido"
                    className="register-user-card__control"
                    name="apellido"
                    type="text"
                    placeholder="Apellido"
                    value={values.apellido}
                    onChange={onChange}
                  />
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label">
                    Fecha de nacimiento
                  </label>
                  <DatePicker
                    value={values.fecha_nacimiento}
                    onChange={(v) => onChange({ target: { name: 'fecha_nacimiento', value: v } } as React.ChangeEvent<HTMLInputElement>)}
                    placeholder="Selecciona fecha de nacimiento"
                    name="fecha_nacimiento"
                    minDate={MIN_BIRTH_DATE}
                    maxDate={MAX_BIRTH_DATE}
                  />
                </div>

                <div className="register-user-card__field">
                  <label className="register-user-card__label" htmlFor="jornada">
                    Jornada
                  </label>
                  <input
                    id="jornada"
                    className="register-user-card__control"
                    name="jornada"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="40 (por defecto)"
                    value={values.jornada}
                    onChange={onChange}
                  />
                </div>

                <div className="register-user-card__field register-user-card__field--full">
                  <label className="register-user-card__label" htmlFor="sobre_mi">
                    Sobre mí
                  </label>
                  <textarea
                    id="sobre_mi"
                    className="register-user-card__control register-user-card__control--textarea"
                    name="sobre_mi"
                    placeholder="Información adicional del usuario"
                    value={values.sobre_mi}
                    onChange={onChange}
                    rows={4}
                  />
            {error ? (
              <div
                className="register-user-card__feedback register-user-card__feedback--error"
                role="alert"
              >
                <p className="register-user-card__feedback-title">No se pudo crear el usuario</p>
                <p className="register-user-card__feedback-description">{error}</p>
              </div>
            ) : null}

            {success ? (
              <div
                className="register-user-card__feedback register-user-card__feedback--success"
                role="status"
              >
                <p className="register-user-card__feedback-title">Usuario creado</p>
                <p className="register-user-card__feedback-description">{success}</p>
              </div>
            ) : null}

            {optionsError ? (
              <div
                className="register-user-card__feedback register-user-card__feedback--error"
                role="alert"
              >
                <p className="register-user-card__feedback-title">No se pudieron cargar opciones</p>
                <p className="register-user-card__feedback-description">{optionsError}</p>
              </div>
            ) : null}
                </div>
              </div>
            </fieldset>

            <div className="register-user-card__actions">
              <button
                type="submit"
                className="register-user-card__button register-user-card__button--primary"
                disabled={!canSubmit}
              >
                {loading ? <span className="register-user-card__button-spinner" /> : null}
                <span className="register-user-card__button-text">
                  {loading ? 'Creando usuario...' : 'Crear usuario'}
                </span>
              </button>
            </div>
    </form>
  );
}