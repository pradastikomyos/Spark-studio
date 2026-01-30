import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

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
  return useSWR<{ products: ProductRow[]; categories: CategoryRow[] }>(
    'inventory',
    async () => {
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
          .is('deleted_at', null)
          .order('name', { ascending: true }),
        supabase.from('categories').select('id, name, slug, is_active').order('name', { ascending: true }),
      ]);

      if (productsResult.error || categoriesResult.error) {
        const err = new Error('Failed to load inventory') as APIError;
        err.status = 500;
        err.info = { products: productsResult.error, categories: categoriesResult.error };
        throw err;
      }

      return {
        products: (productsResult.data || []) as unknown as ProductRow[],
        categories: (categoriesResult.data || []) as unknown as CategoryRow[],
      };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );
}
