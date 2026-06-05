import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { env } from '@/core/config/env';
import { fetchCurrentUser, type UserProfile } from './user.service';
import { supabase } from '../supabase/supabase.client';
import { clearPendingVerificationEmail, storePendingVerificationEmail } from '@/features/verification/services/verification.service';

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  authEmail: string | null;
  requiresEmailVerification: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [requiresEmailVerification, setRequiresEmailVerification] =
    useState(false);

  const syncUser = useCallback(async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  ) => {
    setLoading(true);
    try {
      if (!session) {
        setUser(null);
        setAuthEmail(null);
        setRequiresEmailVerification(false);
        return;
      }

      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();

      if (authUserError || !authUser) {
        await supabase.auth.signOut();
        setUser(null);
        setAuthEmail(null);
        setRequiresEmailVerification(false);
        return;
      }

      const sessionEmail = authUser.email ?? null;
      setAuthEmail(sessionEmail);

      if (env.emailVerificationEnabled && !authUser.email_confirmed_at) {
        if (sessionEmail) {
          storePendingVerificationEmail(sessionEmail);
        }

        setRequiresEmailVerification(true);
        setUser(null);
        return;
      }

      clearPendingVerificationEmail();
      setRequiresEmailVerification(false);

      const profile = await fetchCurrentUser(authUser.id);

      if (!profile || profile.activo === false) {
        await supabase.auth.signOut();
        setUser(null);
        setAuthEmail(null);
        setRequiresEmailVerification(false);
        return;
      }

      setUser(profile);
    } catch (error) {
      console.error('Error loading current user:', error);
      setUser(null);
      setRequiresEmailVerification(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) void syncUser(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) void syncUser(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncUser]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await syncUser(data.session);
  }, [syncUser]);

  const logout = async () => {
    setLoading(true);
    try {
      clearPendingVerificationEmail();
      await supabase.auth.signOut();
      setUser(null);
      setAuthEmail(null);
      setRequiresEmailVerification(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        authEmail,
        requiresEmailVerification,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
}