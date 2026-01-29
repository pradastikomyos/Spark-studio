import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

type Variant = {
  id: number;
  name: string;
  price: number;
  available: number;
  imageUrl?: string;
};

export type ProductDetail = {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  variants: Variant[];
};

export function useProduct(productId: string | undefined) {
  return useSWR<ProductDetail | null>(
    productId ? ['product', productId] : null,
    async () => {
      const numericId = Number(productId);
      if (!Number.isFinite(numericId)) {
        const err = new Error('Product not found') as APIError;
        err.status = 404;
        throw err;
      }

      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          description,
          image_url,
          product_variants(id, name, price, attributes, is_active, stock, reserved_stock)
        `
        )
        .eq('id', numericId)
        .single();

      if (error || !data) {
        const err = new Error(error?.message || 'Product not found') as APIError;
        err.status = error?.code === 'PGRST116' ? 404 : 500;
        err.info = error;
        throw err;
      }

      const productImage = (data as { image_url?: string | null }).image_url ?? null;
      const variants = ((data as { product_variants?: unknown[] }).product_variants || []) as {
        id: number;
        name: string;
        price: string | number | null;
        attributes: Record<string, unknown> | null;
        is_active: boolean | null;
        stock: number | null;
        reserved_stock: number | null;
      }[];

      const mappedVariants: Variant[] = variants
        .filter((v) => v.is_active !== false)
        .map((v) => {
          const price = typeof v.price === 'number' ? v.price : Number(v.price ?? 0);
          const available = Math.max(0, (v.stock ?? 0) - (v.reserved_stock ?? 0));
          const imageUrl = typeof v.attributes?.image_url === 'string' ? v.attributes.image_url : undefined;
          return {
            id: Number(v.id),
            name: String(v.name),
            price: Number.isFinite(price) ? price : 0,
            available,
            imageUrl: imageUrl ?? productImage ?? undefined,
          };
        });

      return {
        id: Number((data as { id: number | string }).id),
        name: String((data as { name: string }).name),
        description: String((data as { description?: string | null }).description ?? ''),
        imageUrl: productImage ?? undefined,
        variants: mappedVariants,
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  );
}
