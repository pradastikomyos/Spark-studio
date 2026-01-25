import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Hook to automatically refresh session in the background for long-idle admin sessions.
 * Checks every 5 minutes and refreshes if token is close to expiring.
 */
export const useSessionRefresh = () => {
  const { session } = useAuth();

  useEffect(() => {
    // Only run for authenticated users
    if (!session) return;

    const checkAndRefresh = async () => {
      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiresAtMs = expiresAt * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAtMs - now;

      // Refresh if token expires within 10 minutes
      const REFRESH_THRESHOLD = 10 * 60 * 1000;

      if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
        try {
          await supabase.auth.refreshSession();
        } catch (err) {
          console.error('Background session refresh failed:', err);
        }
      }
    };

    // Check immediately on mount
    checkAndRefresh();

    // Then check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);
};
