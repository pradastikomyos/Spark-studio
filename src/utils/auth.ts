import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Token refresh threshold: refresh if token expires within 5 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Ensures the session token is fresh and valid.
 * Proactively refreshes the token if it's close to expiring.
 * 
 * @param currentSession - Current Supabase session
 * @returns Fresh access token or null if refresh failed
 */
export const ensureFreshToken = async (currentSession: Session | null): Promise<string | null> => {
  if (!currentSession?.access_token) {
    return null;
  }

  // Check if token is close to expiring
  const expiresAt = currentSession.expires_at;
  if (!expiresAt) {
    // No expiry info, assume token is valid
    return currentSession.access_token;
  }

  const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAtMs - now;

  // If token expires within threshold, refresh it
  if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
    try {
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
  return currentSession.access_token;
};

// Check if user has admin role from database
export const isAdmin = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Query role assignments table to check if user has admin role
    // Using single role check to avoid .in() query issues with RLS
    const { data, error } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId);
    
    if (error) {
      // RLS might block this query for non-admin users, that's expected
      // Only log in development mode
      if (import.meta.env.DEV) {
        console.debug('Admin check: user is not admin or RLS blocked query');
      }
      return false;
    }
    
    // Check if any of the returned roles are admin roles
    const adminRoles = ['super_admin', 'super-admin', 'admin'];
    return data?.some(row => adminRoles.includes(row.role_name)) ?? false;
  } catch {
    // Silently fail - user is not admin
    return false;
  }
};

export const getDefaultRoute = async (userId: string | undefined): Promise<string> => {
  const admin = await isAdmin(userId);
  return admin ? '/admin/dashboard' : '/';
};
