import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Profile from '@/features/profile/pages/Profile';
import './AdminUserProfilePage.css';

export default function AdminUserProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  if (!id || Number.isNaN(userId)) {
    return <Navigate to="/usuarios" replace />;
  }

  return (
    <main className="admin-user-profile-page">
      <button
        type="button"
        className="admin-user-profile-page__floating-back-btn"
        onClick={() => navigate('/usuarios')}
        aria-label="Volver a usuarios"
      >
        <ArrowLeftIcon className="admin-user-profile-page__floating-back-icon" />
        <span>regresar</span>
      </button>

      <div className="admin-user-profile-page__content">
        <Profile debugUserId={userId} adminEditMode />
      </div>
    </main>
  );
}