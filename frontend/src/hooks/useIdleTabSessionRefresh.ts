import { useEffect, useRef } from 'react';

import { TAB_RETURN_EVENT } from '../constants/browserEvents';
import { supabase } from '../lib/supabase';

const TAB_IDLE_THRESHOLD_MS = 2 * 60 * 1000;

export function useIdleTabSessionRefresh() {
  const hiddenAtRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const lastActiveAtRef = useRef(Date.now());

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleIdleReturn = async (hiddenAt: number) => {
      const idleDuration = Date.now() - hiddenAt;
      if (idleDuration < TAB_IDLE_THRESHOLD_MS) return;
      if (refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;

      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        const { error } = await supabase.auth.refreshSession();
        if (error) return;

        window.dispatchEvent(
          new CustomEvent(TAB_RETURN_EVENT, {
            detail: { idleDuration },
          })
        );
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!hiddenAt) return;

      await handleIdleReturn(hiddenAt);
      lastActiveAtRef.current = Date.now();
    };

    const handleFocus = async () => {
      const now = Date.now();
      const idleDuration = now - lastActiveAtRef.current;
      lastActiveAtRef.current = now;
      if (idleDuration < TAB_IDLE_THRESHOLD_MS) return;

      await handleIdleReturn(now - idleDuration);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
