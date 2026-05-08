import { createContext, useState, useEffect, useContext } from 'react';
import { fetchCurrentUser, type UserProfile } from './user.service';
import { supabase } from '../supabase/supabase.client';

interface UserContextValue {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncUser = async (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
    ) => {
      if (!isMounted) return;

      setLoading(true);

      try {
        if (!session) {
          setUser(null);
          return;
        }

        const profile = await fetchCurrentUser(session.user.id);

        if (!isMounted) return;

        if (!profile || profile.activo === false) {
          await supabase.auth.signOut();
          if (!isMounted) return;
          setUser(null);
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Error loading current user:', error);
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void syncUser(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    <UserContext.Provider value={{ user, loading, logout }}>
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