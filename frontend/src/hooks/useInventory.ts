import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

type ProductVariantRow = {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  price: string | number | null;
  stock: number | null;
  reserved_stock: number | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
};

export type ProductImageRow = {
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  sku: string;
  is_active: boolean;
  deleted_at: string | null;
  categories?: { id: number; name: string; slug: string; is_active: boolean | null } | null;
  product_variants?: ProductVariantRow[] | null;
  product_images?: ProductImageRow[] | null;
};

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean | null;
};

export function useInventory() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.inventory(),
    queryFn: async ({ signal }) => {
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              `
                id,
                name,
                slug,
                description,
                category_id,
                sku,
                is_active,
                deleted_at,
                categories(id, name, slug, is_active),
                product_images(image_url, is_primary, display_order),
                product_variants(
                  id,
                  product_id,
                  name,
                  sku,
                  price,
                  stock,
                  reserved_stock,
                  attributes,
                  is_active
                )
              `
            )
            .abortSignal(signal)
            .is('deleted_at', null)
            .order('name', { ascending: true }),
          supabase
            .from('categories')
            .select('id, name, slug, is_active')
            .abortSignal(signal)
            .order('name', { ascending: true }),
        ]);

        if (productsResult.error || categoriesResult.error) {
          const err = new Error('Failed to load inventory') as APIError;
          err.status = productsResult.error?.code === '409' ? 409 : 500;
          err.info = { products: productsResult.error, categories: categoriesResult.error };
          throw err;
        }

        return {
          products: (productsResult.data || []) as unknown as ProductRow[],
          categories: (categoriesResult.data || []) as unknown as CategoryRow[],
        };
      } catch (error) {
        // Ignore AbortError - this happens when request is cancelled due to navigation/focus change
        if (error instanceof Error && error.name === 'AbortError') {
          // Return empty data to prevent SWR from showing error
          return { products: [], categories: [] };
        }
        throw error;
      }
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
