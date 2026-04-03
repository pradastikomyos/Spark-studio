import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';

const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;

export function useSessionRefresh() {
  const { initialized, session, refreshSession } = useAuth();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!initialized || !session) {
      clearTimer();
      return;
    }

    let cancelled = false;

    const runRefresh = async () => {
      try {
        await refreshSession();
      } catch (error) {
        if (cancelled) return;
        console.warn('[SessionRefresh] Refresh failed, retrying in 30s:', error);
        refreshTimerRef.current = setTimeout(() => {
          void runRefresh();
        }, RETRY_DELAY_MS);
      }
    };

    const expiresAt = session.expires_at;
    if (!expiresAt) {
      clearTimer();
      return;
    }

    const refreshAtMs = expiresAt * 1000 - Date.now() - REFRESH_BUFFER_MS;
    clearTimer();

    if (refreshAtMs <= 0) {
      void runRefresh();
    } else {
      refreshTimerRef.current = setTimeout(() => {
        void runRefresh();
      }, refreshAtMs);
    }

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [clearTimer, initialized, refreshSession, session]);

  return { refreshSession };
}
