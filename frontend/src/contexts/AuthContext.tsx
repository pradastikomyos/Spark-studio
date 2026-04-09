/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { lookupAdminRole } from '../auth/adminRole';
import { getValidatedAccessToken, readCurrentSessionSnapshot } from '../auth/sessionAccess';
import { isFatalRefreshError, isNetworkIssue } from '../auth/sessionErrors';
import { supabase } from '../lib/supabase';
import { SessionErrorHandler } from '../utils/sessionErrorHandler';
import { validateSessionWithRetry } from '../utils/sessionValidation';

type SessionStatus = 'ready' | 'recovering' | 'expired';
type AdminStatus = 'checking' | 'ready' | 'denied';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  sessionStatus: SessionStatus;
  adminStatus: AdminStatus;
  isAdmin: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_RECOVERY_DELAY_MS = 30 * 1000;
const INITIAL_SESSION_TIMEOUT_MS = 5000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('expired');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('checking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const validateSessionRef = useRef<(() => Promise<boolean>) | null>(null);
  const userIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isAdminRef = useRef(false);
  const adminStatusRef = useRef<AdminStatus>('checking');

  const errorHandler = useMemo(
    () =>
      new SessionErrorHandler({
        // AuthContext owns recovery and sign-out side effects explicitly.
      }),
    []
  );

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const resetAuthState = useCallback(
    (nextSessionStatus: SessionStatus = 'expired') => {
      clearRecoveryTimer();
      userIdRef.current = null;
      sessionRef.current = null;
      isAdminRef.current = false;
      adminStatusRef.current = 'denied';
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setSessionStatus(nextSessionStatus);
      setAdminStatus('denied');
    },
    [clearRecoveryTimer]
  );

  const scheduleRecovery = useCallback((delayMs = AUTH_RECOVERY_DELAY_MS) => {
    if (recoveryTimerRef.current) return;

    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      void validateSessionRef.current?.();
    }, delayMs);
  }, []);

  const enterRecoveryMode = useCallback(
    (localSession: Session | null) => {
      clearRecoveryTimer();
      sessionRef.current = localSession;
      if (localSession) {
        userIdRef.current = localSession.user?.id ?? null;
        setSession(localSession);
        setUser(localSession.user);
      }
      setSessionStatus('recovering');
      const nextAdminStatus =
        adminStatusRef.current === 'ready' && isAdminRef.current ? 'ready' : 'checking';
      adminStatusRef.current = nextAdminStatus;
      setAdminStatus(nextAdminStatus);
      scheduleRecovery();
    },
    [clearRecoveryTimer, scheduleRecovery]
  );

  const markSessionRecovering = useCallback(
    (localSession: Session | null) => {
      if (!localSession) {
        resetAuthState();
        return;
      }

      enterRecoveryMode(localSession);
    },
    [enterRecoveryMode, resetAuthState]
  );

  const applyValidatedSession = useCallback(
    (nextSession: Session, nextUser: User) => {
      clearRecoveryTimer();
      sessionRef.current = nextSession;
      userIdRef.current = nextUser.id;
      setSession(nextSession);
      setUser(nextUser);
      setSessionStatus('ready');
    },
    [clearRecoveryTimer]
  );

  const checkAdminStatus = useCallback(
    async (userId: string | undefined, allowRecovery = false): Promise<boolean | null> => {
      if (!userId) {
        isAdminRef.current = false;
        adminStatusRef.current = 'denied';
        setIsAdmin(false);
        setAdminStatus('denied');
        return false;
      }

      const preserveResolvedAdmin =
        allowRecovery && isAdminRef.current && adminStatusRef.current === 'ready';
      if (!preserveResolvedAdmin) {
        adminStatusRef.current = 'checking';
        setAdminStatus('checking');
      }

      const result = await lookupAdminRole(userId);
      if (result.ok) {
        isAdminRef.current = result.isAdmin;
        adminStatusRef.current = result.isAdmin ? 'ready' : 'denied';
        setIsAdmin(result.isAdmin);
        setAdminStatus(result.isAdmin ? 'ready' : 'denied');
        return result.isAdmin;
      }

      if (result.transient && allowRecovery) {
        const nextAdminStatus =
          adminStatusRef.current === 'ready' && isAdminRef.current ? 'ready' : 'checking';
        adminStatusRef.current = nextAdminStatus;
        setAdminStatus(nextAdminStatus);
        scheduleRecovery();
        return null;
      }

      isAdminRef.current = false;
      adminStatusRef.current = 'denied';
      setIsAdmin(false);
      setAdminStatus('denied');
      return false;
    },
    [scheduleRecovery]
  );

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshTask = (async () => {
      const localSession = sessionRef.current;
      const previousUserId = userIdRef.current;

      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          if (isNetworkIssue(error) && localSession) {
            markSessionRecovering(localSession);
            if (localSession.user?.id) {
              void checkAdminStatus(localSession.user.id, true);
            }
            return;
          }

          if (isFatalRefreshError(error)) {
            await supabase.auth.signOut();
            resetAuthState();
          }

          throw error;
        }

        if (!data.session) {
          const emptySessionError = new Error('Session refresh returned no session');
          resetAuthState();
          throw emptySessionError;
        }

        applyValidatedSession(data.session, data.session.user);
        if (previousUserId !== data.session.user.id) {
          await checkAdminStatus(data.session.user.id, true);
        }
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshTask;
    return refreshTask;
  }, [applyValidatedSession, checkAdminStatus, markSessionRecovering, resetAuthState]);

  const validateSessionInternal = useCallback(
    async function validateSessionInternal(
      localSession: Session | null,
      allowRecovery = true,
      tryRefresh = true
    ): Promise<boolean> {
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
        void checkAdminStatus(localSession.user?.id, true);
        scheduleRecovery();
        return true;
      }

      if (tryRefresh) {
        try {
          await refreshSession();
          const refreshedSession = await readCurrentSessionSnapshot(8000, 'Session fetch timeout');
          if (refreshedSession) {
            return validateSessionInternal(refreshedSession, allowRecovery, false);
          }
        } catch (refreshError) {
          if (allowRecovery && isNetworkIssue(refreshError)) {
            markSessionRecovering(localSession);
            void checkAdminStatus(localSession.user?.id, true);
            scheduleRecovery();
            return true;
          }
        }
      }

      await supabase.auth.signOut();
      resetAuthState();
      return false;
    },
    [
      applyValidatedSession,
      checkAdminStatus,
      markSessionRecovering,
      refreshSession,
      resetAuthState,
      scheduleRecovery,
    ]
  );

  const validateSession = useCallback(async (): Promise<boolean> => {
    const currentSession = await readCurrentSessionSnapshot(8000, 'Session fetch timeout');
    return validateSessionInternal(currentSession ?? sessionRef.current, true, true);
  }, [validateSessionInternal]);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    return getValidatedAccessToken({
      session,
      validateSession,
      timeoutMs: 8000,
      timeoutMessage: 'Session fetch timeout',
    });
  }, [session, validateSession]);

  useEffect(() => {
    validateSessionRef.current = validateSession;
  }, [validateSession]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    adminStatusRef.current = adminStatus;
  }, [adminStatus]);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = true;
    let initialSession: Session | null = null;

    const initializeAuth = async () => {
      try {
        initialSession = await readCurrentSessionSnapshot(
          INITIAL_SESSION_TIMEOUT_MS,
          `Auth session timeout after ${INITIAL_SESSION_TIMEOUT_MS / 1000}s`
        );

        if (!isMounted) return;

        if (initialSession) {
          await validateSessionInternal(initialSession, true, true);
        } else {
          resetAuthState();
        }
      } catch (error) {
        if (!isMounted) return;

        if (isNetworkIssue(error)) {
          enterRecoveryMode(initialSession);
        } else {
          await errorHandler.handleAuthError(error, { returnPath: window.location.pathname });
          resetAuthState();
        }
      } finally {
        isInitializing = false;
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    void initializeAuth();

    let authEventId = 0;

    const invalidateAuthStateAfterFailedValidation = async () => {
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('[AuthContext] Failed to sign out after invalid auth validation:', signOutError);
      } finally {
        if (isMounted) {
          resetAuthState();
        }
      }
    };

    const runPostAuthValidation = async (event: string, nextSession: Session | null, eventId: number) => {
      if (!nextSession?.user?.id) return;

      try {
        const result = await validateSessionWithRetry();

        if (!isMounted || eventId !== authEventId) return;

        if (result.valid && result.user && result.session) {
          applyValidatedSession(result.session, result.user);
          const resolvedAdmin = await checkAdminStatus(result.user.id, true);
          if (resolvedAdmin === null) {
            scheduleRecovery();
          }
          return;
        }

        if (result.error?.type === 'network') {
          markSessionRecovering(nextSession);
          void checkAdminStatus(nextSession.user.id, true);
          scheduleRecovery();
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          await invalidateAuthStateAfterFailedValidation();
        }
      } catch (error) {
        console.error(`[AuthContext] ${event} validation error:`, error);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (isInitializing) {
        if (event === 'INITIAL_SESSION' && nextSession) {
          setSession(nextSession);
          setUser(nextSession.user);
          setSessionStatus('recovering');
        }
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        resetAuthState();
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (nextSession) {
          const sameUser = userIdRef.current === nextSession.user.id;
          if (sameUser) {
            applyValidatedSession(nextSession, nextSession.user);
            return;
          }

          setSession(nextSession);
          setUser(nextSession.user);
          setSessionStatus('recovering');
        }
        authEventId += 1;
        const currentEventId = authEventId;
        void runPostAuthValidation(event, nextSession, currentEventId);
        return;
      }

      if (event === 'SIGNED_IN') {
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
  }, [
    applyValidatedSession,
    checkAdminStatus,
    clearRecoveryTimer,
    enterRecoveryMode,
    errorHandler,
    markSessionRecovering,
    resetAuthState,
    scheduleRecovery,
    validateSessionInternal,
  ]);

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
    if (loggingOut) return { error: null };

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
        refreshSession,
        getValidAccessToken,
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
