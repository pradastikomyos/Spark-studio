import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
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
  parent_id: number | null;
};

const INVENTORY_PRODUCTS_PAGE_SIZE = 500;
const INVENTORY_PRODUCTS_SELECT = `
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
`;

async function fetchAllInventoryProducts(signal: AbortSignal): Promise<{ data: ProductRow[] | null; error: unknown }> {
  const products: ProductRow[] = [];
  let from = 0;

  // PostgREST responses are capped; fetch products in pages to avoid silent truncation.
  while (true) {
    const to = from + INVENTORY_PRODUCTS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('products')
      .select(INVENTORY_PRODUCTS_SELECT)
      .abortSignal(signal)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      return { data: null, error };
    }

    const chunk = (data || []) as unknown as ProductRow[];
    products.push(...chunk);

    if (chunk.length < INVENTORY_PRODUCTS_PAGE_SIZE) {
      break;
    }

    from += INVENTORY_PRODUCTS_PAGE_SIZE;
  }

  return { data: products, error: null };
}

export function useInventory() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.inventory(),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          fetchAllInventoryProducts(timeoutSignal),
          supabase
            .from('categories')
            .select('id, name, slug, is_active, parent_id')
            .abortSignal(timeoutSignal)
            .order('name', { ascending: true }),
        ]);

        if (productsResult.error || categoriesResult.error) {
          const err = new Error('Failed to load inventory') as APIError;
          const productsErrorCode =
            productsResult.error && typeof productsResult.error === 'object' && 'code' in productsResult.error
              ? String((productsResult.error as { code: unknown }).code)
              : null;
          err.status = productsErrorCode === '409' ? 409 : 500;
          err.info = { products: productsResult.error, categories: categoriesResult.error };
          throw err;
        }

        return {
          products: (productsResult.data || []) as unknown as ProductRow[],
          categories: (categoriesResult.data || []) as unknown as CategoryRow[],
        };
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return { products: [], categories: [] };
        }
        throw error;
      } finally {
        cleanup();
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
