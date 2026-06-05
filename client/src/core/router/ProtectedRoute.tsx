import { Navigate, Outlet } from 'react-router-dom';
import { env } from '@/core/config/env';
import { useUser } from '@/core/auth/userContext';

type Props = {
  allowedRoles: number[];
};

export function ProtectedRoute({ allowedRoles }: Props) {
  const { user, loading, requiresEmailVerification } = useUser();

  if (loading) return null;
  if (env.emailVerificationEnabled && requiresEmailVerification) {
    return <Navigate to="/correo-verificacion" replace />;
  }

  if (!user) return <Navigate to="/inicio-sesion" replace />;

  if (user.activo === false) {
    return <Navigate to="/inicio-sesion" replace />;
  }

  if (user.idRolGlobal === null || !allowedRoles.includes(user.idRolGlobal)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return <Outlet />;
}