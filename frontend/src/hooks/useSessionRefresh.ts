import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enterprise-grade session refresh hook
 * Implements proactive token refresh pattern used by Google, Slack, Notion
 * 
 * Strategy:
 * - Supabase JWT expires after 3600s (1 hour)
 * - Refresh token 5 minutes before expiry (industry standard buffer)
 * - Silent background refresh (no user disruption)
 * - Automatic retry on failure
 */

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
const RETRY_DELAY_MS = 30 * 1000; // 30 seconds retry on failure
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // Check every minute

export function useSessionRefresh() {
  const { user, session } = useAuth();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('[SessionRefresh] Already refreshing, skipping');
      return;
    }

    isRefreshingRef.current = true;
    console.log('[SessionRefresh] Refreshing session token...');

    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[SessionRefresh] Refresh failed:', error);
        
        // Fatal errors that require re-login (cannot be recovered by retry)
        const fatalErrors = [
          'refresh token not found',
          'invalid refresh token',
          'refresh token expired',
          'invalid_grant',
        ];
        
        const isFatal = fatalErrors.some(msg => 
          error.message?.toLowerCase().includes(msg)
        );
        
        if (isFatal) {
          console.error('[SessionRefresh] Fatal refresh error detected - forcing logout');
          clearTimers();
          await supabase.auth.signOut();
          window.location.href = '/login?reason=session_expired';
          return;
        }
        
        // Retry after delay for non-fatal errors
        refreshTimerRef.current = setTimeout(refreshSession, RETRY_DELAY_MS);
        return;
      }

      if (data.session) {
        console.log('[SessionRefresh] Session refreshed successfully');
        scheduleNextRefresh(data.session.expires_at);
      }
    } catch (error) {
      console.error('[SessionRefresh] Unexpected error:', error);
      // Retry after delay
      refreshTimerRef.current = setTimeout(refreshSession, RETRY_DELAY_MS);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [clearTimers]);

  const scheduleNextRefresh = useCallback((expiresAt?: number) => {
    clearTimers();

    if (!expiresAt) {
      console.log('[SessionRefresh] No expiry time, skipping schedule');
      return;
    }

    const expiryTime = expiresAt * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    const refreshTime = timeUntilExpiry - REFRESH_BUFFER_MS;

    if (refreshTime <= 0) {
      // Token already expired or about to expire, refresh immediately
      console.log('[SessionRefresh] Token expired or expiring soon, refreshing now');
      void refreshSession();
    } else {
      console.log(`[SessionRefresh] Scheduling refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      refreshTimerRef.current = setTimeout(refreshSession, refreshTime);
    }
  }, [refreshSession, clearTimers]);

  const heartbeat = useCallback(async () => {
    if (!user) return;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.warn('[SessionRefresh] Heartbeat: No active session');
        clearTimers();
        return;
      }

      // Check if we need to refresh soon
      const expiryTime = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      if (timeUntilExpiry < REFRESH_BUFFER_MS && !isRefreshingRef.current) {
        console.log('[SessionRefresh] Heartbeat: Token expiring soon, triggering refresh');
        void refreshSession();
      }
    } catch (error) {
      console.error('[SessionRefresh] Heartbeat error:', error);
    }
  }, [user, refreshSession, clearTimers]);

  // Initialize session refresh on mount and when session expiry changes
  useEffect(() => {
    if (!user || !session) {
      clearTimers();
      return;
    }

    console.log('[SessionRefresh] Initializing for user:', user.id);
    
    // Schedule initial refresh
    scheduleNextRefresh(session.expires_at);

    // Start heartbeat
    heartbeatTimerRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      console.log('[SessionRefresh] Cleaning up');
      clearTimers();
    };
  }, [user?.id, session?.expires_at, scheduleNextRefresh, heartbeat, clearTimers]);

  // Handle visibility change - refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isRefreshingRef.current) {
        console.log('[SessionRefresh] Tab visible, checking session');
        heartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, heartbeat]);

  return { refreshSession };
}
