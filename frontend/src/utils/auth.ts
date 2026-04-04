import type { Session } from '@supabase/supabase-js';
import { lookupAdminRole } from '../auth/adminRole';
import { readCurrentAccessToken, readCurrentSessionSnapshot } from '../auth/sessionAccess';
import { supabase } from '../lib/supabase';

// Token refresh threshold: refresh if token expires within 5 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Ensures the session token is fresh and valid.
 * Proactively refreshes the token if it's close to expiring.
 * 
 * @param currentSession - Current Supabase session
 * @returns Fresh access token or null if refresh failed
 */
export const ensureFreshToken = async (
  currentSession: Session | null,
  options?: { refreshSession?: () => Promise<void> }
): Promise<string | null> => {
  const latestSession = await readCurrentSessionSnapshot(8000, 'Session fetch timeout').catch(() => null);
  const sessionToUse =
    latestSession?.access_token && latestSession.access_token !== currentSession?.access_token ? latestSession : currentSession;

  if (!sessionToUse?.access_token) {
    return null;
  }

  // Check if token is close to expiring
  const expiresAt = sessionToUse.expires_at;
  if (!expiresAt) {
    // No expiry info, assume token is valid
    return sessionToUse.access_token;
  }

  const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAtMs - now;

  // If token expires within threshold, refresh it
  if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
    try {
      if (typeof options?.refreshSession === 'function') {
        await options.refreshSession();
        return readCurrentAccessToken(8000, 'Session fetch timeout');
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session?.access_token) {
        console.error('Failed to refresh session:', error?.message);
        return null;
      }

      return data.session.access_token;
    } catch (err) {
      console.error('Error refreshing session:', err);
      return null;
    }
  }

  // Token is still fresh
  return sessionToUse.access_token;
};

// Check if user has admin role from database
export const isAdmin = async (userId: string | undefined): Promise<boolean> => {
  try {
    const result = await lookupAdminRole(userId);
    return result.ok ? result.isAdmin : false;
  } catch {
    return false;
  }
};

export const getDefaultRoute = async (userId: string | undefined): Promise<string> => {
  const admin = await isAdmin(userId);
  return admin ? '/admin/dashboard' : '/';
};

/**
 * Get user display name.
 * Priority: user_metadata.name > email prefix > fallback
 * 
 * @param user - Supabase User object or just email string
 * @returns Display name from metadata, or email prefix, or fallback
 */
export const getUserDisplayName = (
  user: { email?: string | null; user_metadata?: { name?: string } } | string | undefined | null
): string => {
  if (!user) return 'User';

  // If it's a string, treat as email
  if (typeof user === 'string') {
    const atIndex = user.indexOf('@');
    if (atIndex === -1) return user;
    return user.substring(0, atIndex);
  }

  // Check user_metadata.name first (from signup)
  if (user.user_metadata?.name) {
    return user.user_metadata.name;
  }

  // Fallback to email prefix
  if (user.email) {
    const atIndex = user.email.indexOf('@');
    if (atIndex === -1) return user.email;
    return user.email.substring(0, atIndex);
  }

  return 'User';
};
