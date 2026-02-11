import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

/**
 * Category interface
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

/**
 * Custom SWR hook for fetching product categories
 * 
 * Features:
 * - Fetches all active categories
 * - Caches results for 5 minutes (categories change infrequently)
 * - Does not revalidate on focus
 * - Automatic retry on error with exponential backoff
 * 
 * @returns SWR response with categories data, error, loading states, and mutate function
 * 
 * @example
 * const { data: categories, error, isLoading } = useCategories();
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, parent_id')
          .abortSignal(timeoutSignal)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          const err = new Error(error.message) as APIError;
          err.status = error.code === 'PGRST116' ? 404 : 500;
          err.info = error;
          throw err;
        }

        return (data || []) as Category[];
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
