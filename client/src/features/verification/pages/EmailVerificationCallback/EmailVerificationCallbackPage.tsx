import EmailVerificationCallbackCard from '@/features/verification/components/EmailVerificationCallbackCard';
import { useEmailVerificationCallbackScreen } from '@/features/verification/hooks/useEmailVerificationCallbackScreen';
import AuthCardLayout from '@/shared/components/AuthCardLayout';
import './EmailVerificationCallbackPage.css';

export default function EmailVerificationCallbackPage() {
  const { state, isRedirecting, goToLogin } = useEmailVerificationCallbackScreen();

  return (
    <AuthCardLayout>
      <div className="email-verification-callback-page">
        <EmailVerificationCallbackCard
          status={state.status}
          title={state.title}
          description={state.description}
          email={state.email}
          isRedirecting={isRedirecting}
          onGoToLogin={goToLogin}
        />
      </div>
    </AuthCardLayout>
  );
}