import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdmin as checkIsAdmin } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  initialized: boolean; // NEW: true when auth check is complete
  isAdmin: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false); // KEY: blocks render until ready
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Memoized admin check to avoid re-creating function
  const checkAdminStatus = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    try {
      const adminStatus = await checkIsAdmin(userId);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // STEP 1: Get initial session (this reads from localStorage first - FAST!)
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Check admin status if user exists
        if (session?.user?.id) {
          await checkAdminStatus(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      } finally {
        // CRITICAL: Mark as initialized regardless of success/failure
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // STEP 2: Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Update session and user immediately
        setSession(session);
        setUser(session?.user ?? null);

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
        } else if (session?.user?.id) {
          // Check admin status on sign in or token refresh
          await checkAdminStatus(session.user.id);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
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

  const signOut = async (): Promise<{ error: Error | null }> => {
    if (loggingOut) return { error: null }; // Prevent double-click
    
    try {
      setLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        return { error };
      }
      // State will be cleared by onAuthStateChange listener
      return { error: null };
    } catch (err) {
      console.error('Unexpected logout error:', err);
      return { error: err instanceof Error ? err : new Error('Logout failed') };
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        initialized, 
        isAdmin, 
        loggingOut, 
        signIn, 
        signUp, 
        signOut 
      }}
    >
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
