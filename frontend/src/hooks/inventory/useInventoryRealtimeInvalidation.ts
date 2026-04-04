import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';

const INVENTORY_INVALIDATION_DEBOUNCE_MS = 700;
const INVENTORY_REALTIME_TABLES = ['products', 'product_variants', 'product_images', 'categories'] as const;

export const clearInventoryFallbackCache = () => {
  // Client full-scan fallback is intentionally disabled; invalidation remains for future cache layers.
};

export function useInventoryRealtimeInvalidation(
  queryClient: Pick<QueryClient, 'invalidateQueries'>
) {
  useEffect(() => {
    let invalidateTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimeoutId) return;
      invalidateTimeoutId = setTimeout(() => {
        invalidateTimeoutId = null;
        clearInventoryFallbackCache();
        void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      }, INVENTORY_INVALIDATION_DEBOUNCE_MS);
    };

    const channel = INVENTORY_REALTIME_TABLES.reduce(
      (currentChannel, table) =>
        currentChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleInvalidate),
      supabase.channel('inventory_changes')
    ).subscribe();

    return () => {
      if (invalidateTimeoutId) {
        clearTimeout(invalidateTimeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
