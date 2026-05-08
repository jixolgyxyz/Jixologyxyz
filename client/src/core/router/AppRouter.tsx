import { Routes, Route, Navigate } from 'react-router-dom';

// --- Páginas ---
import LoginPage from '@/features/auth/pages/LogInPage';
import ProfilePage from '@/features/profile/pages';
import UserDashboardPage from '@/features/dashboard/pages/UserDashboard';
import EmailVerificationPage from '@/features/verification/pages/EmailVerification';
import AdminPage from '@/features/admin/pages/adminPage';
import ProjectPage from '@/features/project/projectHub/pages/ProjectsPage';
import ProjectTask from '@/features/project/ProjectTasks/pages';
import ProjectBacklog from '@/features/project/Backlog/pages/ProjectBacklog';
import ProjectConfigPage from '@/features/project/projectConfig/pages/ProjectConfigPage';
import AdminUserProfilePage from '@/features/admin/pages/adminUserProfilePage/AdminUserProfilePage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import NotificationDetailPage from '@/features/notifications/pages/NotificationDetailPage';

// --- Layout ---
import AppLayoutHs from '@/shared/layout/AppLayoutHs';
import AppLayoutHsProject from '@/shared/layout/AppLayoutHsProject';

// --- Router ---
import { ProtectedRoute } from '@/core/router/ProtectedRoute';

const ALL_ROLES = [1, 2, 3, 4];
const ADMIN_VIEWS = [1,2];

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio-sesion" replace />} />

      <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
        <Route element={<AppLayoutHs title="Proyectos" />}>
          <Route path="/proyectos"         element={<ProjectPage />} />
        </Route>
        <Route element={<AppLayoutHs title="Perfil de Usuario"/>}>
          <Route path="/perfil"            element={<ProfilePage />} />
        </Route>
        <Route element={<AppLayoutHs title="Dashboard"/>}>
          <Route path="/dashboard-usuario" element={<UserDashboardPage />} />
          <Route path="/notificaciones"    element={<NotificationsPage />} />
          <Route path="/notificaciones/:id" element={<NotificationDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={ADMIN_VIEWS} />}>
          <Route element={<AppLayoutHs title="Usuarios"/>}>
            <Route path="/usuarios" element={<AdminPage />} />
            <Route path="/usuarios/:id" element={<AdminUserProfilePage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
        <Route element={<AppLayoutHsProject title="Proyecto" />}>
          <Route path="/proyectos/:id" element={<Navigate to="/proyectos/:id/backlog" replace />} />
          <Route path="/proyectos/:id/tasks"          element={<ProjectTask />} />
          <Route path="/proyectos/:id/backlog"        element={<ProjectBacklog />} />
          <Route path="/proyectos/:id/configuracion"  element={<ProjectConfigPage />} />
        </Route>
      </Route>

      <Route path="/inicio-sesion"        element={<LoginPage />} />
      <Route path="/correo-verificacion"  element={<EmailVerificationPage />} />
    </Routes>
  );
}