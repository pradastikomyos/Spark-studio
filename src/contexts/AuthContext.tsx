import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdmin as checkIsAdmin } from '../utils/auth';
import { validateSessionWithRetry } from '../utils/sessionValidation';
import { SessionErrorHandler } from '../utils/sessionErrorHandler';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  initialized: boolean; // NEW: true when auth check is complete
  isAdmin: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  validateSession: () => Promise<boolean>; // NEW: explicit validation method
  refreshSession: () => Promise<void>; // NEW: manual refresh trigger
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false); // KEY: blocks render until ready
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const errorHandler = new SessionErrorHandler({
    // AuthContext handles navigation/signOut manually or via onAuthStateChange
  });

  // NEW: Manual session refresh
  const refreshSession = useCallback(async () => {
    console.log('[AuthContext] Manual session refresh triggered');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[AuthContext] Refresh failed:', error);
        throw error;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        console.log('[AuthContext] Session refreshed successfully');
      }
    } catch (error) {
      console.error('[AuthContext] Refresh error:', error);
      throw error;
    }
  }, []);

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
      if (error instanceof Error && !error.message.includes('RLS')) {
        // Suppress RLS errors for non-admin users
      }
      setIsAdmin(false);
    }
  }, []);

  // NEW: Explicit session validation method with automatic refresh
  // Enterprise pattern: Google/Slack/Notion - try refresh before declaring session invalid
  const validateSession = useCallback(async (): Promise<boolean> => {
    console.log('[AuthContext] Validating session...');
    
    // Step 1: Check current session
    const result = await validateSessionWithRetry();

    if (result.valid && result.user && result.session) {
      console.log('[AuthContext] Session valid');
      setUser(result.user);
      setSession(result.session);
      await checkAdminStatus(result.user.id);
      return true;
    }

    // Step 2: Session invalid - try to refresh FIRST (enterprise pattern)
    // Google/Slack/Notion all do silent token refresh before showing errors
    console.log('[AuthContext] Session invalid, attempting automatic refresh...');
    try {
      await refreshSession();
      
      // Step 3: Validate again after refresh
      const retryResult = await validateSessionWithRetry();
      if (retryResult.valid && retryResult.user && retryResult.session) {
        console.log('[AuthContext] Session refreshed successfully and now valid');
        setUser(retryResult.user);
        setSession(retryResult.session);
        await checkAdminStatus(retryResult.user.id);
        return true;
      }
      
      console.log('[AuthContext] Session still invalid after refresh');
    } catch (refreshError) {
      console.error('[AuthContext] Refresh failed:', refreshError);
    }

    // Step 4: Clear state only (let caller handle error display)
    // Separation of concerns: validateSession is a utility, not an error handler
    console.log('[AuthContext] Session validation failed after refresh attempt');
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    return false;
  }, [checkAdminStatus, refreshSession]);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = true; // Track if initial auth check is in progress

    // STEP 1: Get initial session with timeout protection and server-side validation
    const initializeAuth = async () => {
      try {
        const getSessionWithTimeout = Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth session timeout after 5s')), 5000)
          )
        ]);

        const { data: { session } } = await getSessionWithTimeout;

        if (!isMounted) return;

        // Validate session using the new validation utility with retry logic
        if (session) {
          const result = await validateSessionWithRetry();

          if (!isMounted) return;

          if (result.valid && result.user && result.session) {
            // Session is valid
            setSession(result.session);
            setUser(result.user);
            if (result.user.id) {
              await checkAdminStatus(result.user.id);
            }
          } else {
            // Session is invalid on server, clear it

            await errorHandler.handleAuthError(result.error || { status: 401 }, {
              returnPath: window.location.pathname
            });
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }

        if (!isMounted) return;
      } catch (error) {
        if (!isMounted) return;
        await errorHandler.handleAuthError(error, { returnPath: window.location.pathname });
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      } finally {
        isInitializing = false;
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

        setSession(session);
        setUser(session?.user ?? null);

        if (isInitializing) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
        } else if (event === 'SIGNED_IN') {
          // Validate new session on sign in
          if (session?.user?.id) {
            const result = await validateSessionWithRetry();
            if (result.valid && result.user) {
              await checkAdminStatus(result.user.id);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Validate refreshed token
          if (session?.user?.id) {
            const result = await validateSessionWithRetry();
            if (result.valid && result.user) {
              await checkAdminStatus(result.user.id);
            } else {
              // Refreshed token is invalid, sign out
              console.warn('Refreshed token validation failed');
              await supabase.auth.signOut();
            }
          }
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
        return { error };
      }
      return { error: null };
    } catch (err) {
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
        signOut,
        validateSession,
        refreshSession
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
