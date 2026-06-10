import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import AuthCardLayout from '@/shared/components/AuthCardLayout';
import { useLogInPage } from '@/features/auth/hooks/useLogInPage';
import './LogInPage.css';

export default function LogInPage() {
  const {
    showPassword,
    setShowPassword,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    info,
    handleLogin,
  } = useLogInPage();

  return (
    <AuthCardLayout>
      <div className="log-in-page">
        <h1 className="log-in-page__title">Iniciar sesión</h1>

        <form className="log-in-page__form" onSubmit={handleLogin}>
          <div className="log-in-page__form-group">
            <label htmlFor="email" className="log-in-page__label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="log-in-page__input"
              placeholder="Ingresa tu correo electrónico"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="log-in-page__form-group">
            <label htmlFor="password" className="log-in-page__label">
              Contraseña
            </label>

            <div className="log-in-page__password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="log-in-page__input log-in-page__input--password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="log-in-page__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <EyeSlashIcon className="log-in-page__eye-icon" />
                ) : (
                  <EyeIcon className="log-in-page__eye-icon" />
                )}
              </button>
            </div>
          </div>

{(error || info) && (
            <div
              className={`log-in-page__status-card ${
                error
                  ? 'log-in-page__status-card--error'
                  : 'log-in-page__status-card--success'
              }`}
            >
              <div className="log-in-page__status-title">
                {error ? 'Error al iniciar sesión' : 'Operación exitosa'}
              </div>

              <p className="log-in-page__status-text">{error || info}</p>
            </div>
          )}

          <button
            type="submit"
            className="log-in-page__button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="log-in-page__button-spinner"
                  aria-hidden="true"
                />
                <span className="log-in-page__button-text">
                  Iniciando sesión...
                </span>
              </>
            ) : (
              <span className="log-in-page__button-text">
                Iniciar sesión
              </span>
            )}
          </button>
        </form>
      </div>
    </AuthCardLayout>
  );
}