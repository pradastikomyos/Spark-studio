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
      if (error instanceof Error && !error.message.includes('RLS')) {
        // Suppress RLS errors for non-admin users
      }
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = true; // Track if initial auth check is in progress

    // STEP 1: Get initial session with timeout protection
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

        // Validate session by checking if it's actually valid on server
        // If session exists but is expired, force refresh or sign out
        if (session) {
          try {
            // Try to get user to validate session is still valid
            const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !validatedUser) {
              // Session is invalid on server, clear it
              console.warn('Session invalid on server, clearing local session');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setIsAdmin(false);
            } else {
              // Session is valid
              setSession(session);
              setUser(validatedUser);
              if (validatedUser.id) {
                await checkAdminStatus(validatedUser.id);
              }
            }
          } catch (validationError) {
            console.error('Session validation error:', validationError);
            // On validation error, clear session to be safe
            await supabase.auth.signOut();
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
      } catch {
        if (!isMounted) return;
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
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user?.id) {
            await checkAdminStatus(session.user.id);
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
