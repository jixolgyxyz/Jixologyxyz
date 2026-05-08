import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@/core/auth/userContext';

type Props = {
  allowedRoles: number[];
};

export function ProtectedRoute({ allowedRoles }: Props) {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) return <Navigate to="/inicio-sesion" replace />;

  if (user.activo === false) {
    return <Navigate to="/inicio-sesion" replace />;
  }

  if (user.idRolGlobal === null || !allowedRoles.includes(user.idRolGlobal)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return <Outlet />;
}