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
      // Suppress non-critical admin check errors (expected for non-admin users)
      if (error instanceof Error && !error.message.includes('RLS')) {
        console.error('Error checking admin status:', error);
      }
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = true; // Track if initial auth check is in progress

    // STEP 1: Get initial session with timeout protection
    const initializeAuth = async () => {
      console.log('[Auth] Starting initialization...');
      try {
        // Add 5 second timeout to prevent infinite hang
        const getSessionWithTimeout = Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Auth session timeout after 5s')), 5000)
          )
        ]);

        const { data: { session }, error } = await getSessionWithTimeout;
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        if (!isMounted) return;

        console.log('[Auth] Session retrieved:', session ? 'logged in' : 'no session');
        setSession(session);
        setUser(session?.user ?? null);

        // Check admin status if user exists
        if (session?.user?.id) {
          await checkAdminStatus(session.user.id);
        }
        
        // Check again if still mounted after async operation
        if (!isMounted) return;
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      } finally {
        // Mark initialization complete
        isInitializing = false;
        if (isMounted) {
          setInitialized(true);
          console.log('[Auth] Initialization complete');
        }
      }
    };

    initializeAuth();

    // STEP 2: Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore events during initial mount - let initializeAuth handle it
        if (isInitializing) {
          console.log('[Auth] Ignoring event during initialization:', event);
          return;
        }

        if (!isMounted) return;

        console.log('[Auth] Auth state changed:', event);
        
        // Update session and user immediately
        setSession(session);
        setUser(session?.user ?? null);

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Only check admin status for actual sign-in or token refresh events
          if (session?.user?.id) {
            await checkAdminStatus(session.user.id);
          }
        }
        // For other events (USER_UPDATED, etc.), keep existing admin status
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
