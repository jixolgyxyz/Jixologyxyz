import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { fetchCurrentUser, type UserProfile } from './user.service';
import { supabase } from '../supabase/supabase.client';

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  ) => {
    setLoading(true);
    try {
      if (!session) {
        setUser(null);
        return;
      }

      const profile = await fetchCurrentUser(session.user.id);

      if (!profile || profile.activo === false) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser(profile);
    } catch (error) {
      console.error('Error loading current user:', error);
      setUser(null);
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
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
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
