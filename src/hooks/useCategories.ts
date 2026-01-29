import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

/**
 * Category interface
 */
export interface Category {
  name: string;
  slug: string;
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
  return useSWR<Category[]>(
    'categories',
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name, slug')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        const err = new Error(error.message) as APIError;
        err.status = error.code === 'PGRST116' ? 404 : 500;
        err.info = error;
        throw err;
      }

      return (data || []) as Category[];
    },
    {
      // Categories change infrequently
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );
}
