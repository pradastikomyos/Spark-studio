/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
import { validateSessionWithRetry } from '../utils/sessionValidation';
import { SessionErrorHandler } from '../utils/sessionErrorHandler';

type SessionStatus = 'ready' | 'recovering' | 'expired';
type AdminStatus = 'checking' | 'ready' | 'denied';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  initialized: boolean; // NEW: true when auth check is complete
  sessionStatus: SessionStatus;
  adminStatus: AdminStatus;
  isAdmin: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  validateSession: () => Promise<boolean>; // NEW: explicit validation method
  refreshSession: () => Promise<void>; // NEW: manual refresh trigger
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_RECOVERY_DELAY_MS = 30 * 1000;
const ADMIN_ROLE_CHECK_TIMEOUT_MS = 10000;
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin']);

const isNetworkIssue = (error: unknown) => {
  if (error && typeof error === 'object' && 'type' in error) {
    return (error as { type?: unknown }).type === 'network';
  }

  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('network') || message.includes('timeout') || message.includes('fetch');
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false); // KEY: blocks render until ready
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('expired');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('checking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validateSessionRef = useRef<(() => Promise<boolean>) | null>(null);

  const errorHandler = useMemo(
    () =>
      new SessionErrorHandler({
        // AuthContext handles navigation/signOut manually or via onAuthStateChange
      }),
    []
  );

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const resetAuthState = useCallback((nextSessionStatus: SessionStatus = 'expired') => {
    clearRecoveryTimer();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setSessionStatus(nextSessionStatus);
    setAdminStatus('denied');
  }, [clearRecoveryTimer]);

  const scheduleRecovery = useCallback((delayMs = AUTH_RECOVERY_DELAY_MS) => {
    if (recoveryTimerRef.current) return;

    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      void validateSessionRef.current?.();
    }, delayMs);
  }, []);

  const markSessionRecovering = useCallback((localSession: Session | null) => {
    if (!localSession) {
      resetAuthState();
      return;
    }

    setSession(localSession);
    setUser(localSession.user);
    setSessionStatus('recovering');
    setAdminStatus((prev) => (prev === 'ready' && isAdmin ? 'ready' : 'checking'));
  }, [isAdmin, resetAuthState]);

  const applyValidatedSession = useCallback((nextSession: Session, nextUser: User) => {
    clearRecoveryTimer();
    setSession(nextSession);
    setUser(nextUser);
    setSessionStatus('ready');
  }, [clearRecoveryTimer]);

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
        setSessionStatus('ready');
        console.log('[AuthContext] Session refreshed successfully');
      }
    } catch (error) {
      console.error('[AuthContext] Refresh error:', error);
      throw error;
    }
  }, []);

  // Memoized admin check to avoid re-creating function
  const checkAdminStatus = useCallback(async (userId: string | undefined, allowRecovery = false): Promise<boolean | null> => {
    if (!userId) {
      setIsAdmin(false);
      setAdminStatus('denied');
      return false;
    }

    setAdminStatus('checking');

    const { signal, cleanup, didTimeout } = createQuerySignal(undefined, ADMIN_ROLE_CHECK_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select('role_name')
        .eq('user_id', userId)
        .abortSignal(signal);

      if (error) {
        throw error;
      }

      const hasAdminRole = data?.some((row) => ADMIN_ROLES.has(String(row.role_name ?? '').toLowerCase())) ?? false;
      setIsAdmin(hasAdminRole);
      setAdminStatus(hasAdminRole ? 'ready' : 'denied');
      return hasAdminRole;
    } catch (error) {
      if ((didTimeout() || isNetworkIssue(error)) && allowRecovery) {
        setAdminStatus((prev) => (prev === 'ready' && isAdmin ? 'ready' : 'checking'));
        scheduleRecovery();
        return null;
      }

      setIsAdmin(false);
      setAdminStatus('denied');
      return false;
    } finally {
      cleanup();
    }
  }, [isAdmin, scheduleRecovery]);

  const validateSessionInternal = useCallback(
    async function validateSessionInternal(localSession: Session | null, allowRecovery = true, tryRefresh = true): Promise<boolean> {
      if (!localSession) {
        resetAuthState();
        return false;
      }

      const result = await validateSessionWithRetry();
      if (result.valid && result.user && result.session) {
        applyValidatedSession(result.session, result.user);
        const resolvedAdmin = await checkAdminStatus(result.user.id, allowRecovery);
        if (resolvedAdmin === null) {
          scheduleRecovery();
        }
        return true;
      }

      if (result.error?.type === 'network' && allowRecovery) {
        markSessionRecovering(localSession);
        void checkAdminStatus(localSession.user.id, true);
        scheduleRecovery();
        return true;
      }

      if (tryRefresh) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (!error && data.session) {
            return validateSessionInternal(data.session, allowRecovery, false);
          }

          if (allowRecovery && isNetworkIssue(error)) {
            markSessionRecovering(localSession);
            void checkAdminStatus(localSession.user.id, true);
            scheduleRecovery();
            return true;
          }
        } catch (refreshError) {
          if (allowRecovery && isNetworkIssue(refreshError)) {
            markSessionRecovering(localSession);
            void checkAdminStatus(localSession.user.id, true);
            scheduleRecovery();
            return true;
          }
        }
      }

      await supabase.auth.signOut();
      resetAuthState();
      return false;
    },
    [applyValidatedSession, checkAdminStatus, markSessionRecovering, resetAuthState, scheduleRecovery]
  );

  // NEW: Explicit session validation method with automatic refresh
  // Enterprise pattern: Google/Slack/Notion - try refresh before declaring session invalid
  const validateSession = useCallback(async (): Promise<boolean> => {
    console.log('[AuthContext] Validating session...');

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    return validateSessionInternal(currentSession ?? session, true, true);
  }, [session, validateSessionInternal]);

  useEffect(() => {
    validateSessionRef.current = validateSession;
  }, [validateSession]);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = true; // Track if initial auth check is in progress
    let initialSession: Session | null = null;

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
        initialSession = session ?? null;

        if (!isMounted) return;

        if (initialSession) {
          await validateSessionInternal(initialSession, true, true);
        } else {
          resetAuthState();
        }

        if (!isMounted) return;
      } catch (error) {
        if (!isMounted) return;
        if (isNetworkIssue(error) && initialSession) {
          markSessionRecovering(initialSession);
          scheduleRecovery();
        } else {
          await errorHandler.handleAuthError(error, { returnPath: window.location.pathname });
          if (error instanceof Error && error.message.includes('timeout')) {
            await supabase.auth.signOut();
          }
          resetAuthState();
        }
        if (error instanceof Error && error.message.includes('timeout') && !initialSession) {
          await supabase.auth.signOut();
        }
      } finally {
        isInitializing = false;
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // STEP 2: Listen for auth state changes (sign in, sign out, token refresh)
    let authEventId = 0;

    const runPostAuthValidation = async (event: string, nextSession: Session | null, eventId: number) => {
      if (!nextSession?.user?.id) return;

      const startedAt = Date.now();
      console.log(`[Auth] ${event} start`);
      try {
        const result = await validateSessionWithRetry();
        const durationMs = Date.now() - startedAt;
        console.log(`[Auth] ${event} took ${durationMs}ms`);

        if (!isMounted || eventId !== authEventId) return;

        if (result.valid && result.user && result.session) {
          applyValidatedSession(result.session, result.user);
          const resolvedAdmin = await checkAdminStatus(result.user.id, true);
          if (resolvedAdmin === null) {
            scheduleRecovery();
          }
          console.log(`[AuthContext] ${event} validation ok in ${durationMs}ms`);
          return;
        }

        if (result.error?.type === 'network' && nextSession) {
          markSessionRecovering(nextSession);
          void checkAdminStatus(nextSession.user.id, true);
          scheduleRecovery();
          console.warn(`[AuthContext] ${event} validation deferred after network issue in ${durationMs}ms`);
          return;
        }

        console.warn(`[AuthContext] ${event} validation failed in ${durationMs}ms`);

        if (event === 'TOKEN_REFRESHED') {
          await supabase.auth.signOut();
        }
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        console.log(`[Auth] ${event} took ${durationMs}ms`);
        console.error(`[AuthContext] ${event} validation error in ${durationMs}ms:`, error);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (isInitializing) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        resetAuthState();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (nextSession) {
          setSession(nextSession);
          setUser(nextSession.user);
          setSessionStatus('recovering');
        }
        authEventId += 1;
        const currentEventId = authEventId;
        void runPostAuthValidation(event, nextSession, currentEventId);
      }
    });
    const subscription = data?.subscription;

    return () => {
      isMounted = false;
      clearRecoveryTimer();
      subscription?.unsubscribe();
    };
  }, [applyValidatedSession, checkAdminStatus, clearRecoveryTimer, errorHandler, markSessionRecovering, resetAuthState, scheduleRecovery, validateSessionInternal]);

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
        sessionStatus,
        adminStatus,
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
