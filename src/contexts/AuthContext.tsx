import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdmin as checkIsAdmin } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminLoading(false);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      setLoading(false);

      if (session?.user?.id) {
        setAdminLoading(true);
        try {
          const adminStatus = await checkIsAdmin(session.user.id);
          setIsAdmin(adminStatus);
        } finally {
          setAdminLoading(false);
        }
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      setLoading(false);

      if (session?.user?.id) {
        setAdminLoading(true);
        try {
          const adminStatus = await checkIsAdmin(session.user.id);
          setIsAdmin(adminStatus);
        } finally {
          setAdminLoading(false);
        }
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: ({ message: 'Supabase belum terkonfigurasi. Silakan set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.' } as unknown) as AuthError,
      };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      return {
        error: ({ message: 'Supabase belum terkonfigurasi. Silakan set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.' } as unknown) as AuthError,
      };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, adminLoading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
