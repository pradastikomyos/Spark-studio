import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

type Variant = {
  id: number;
  name: string;
  price: number;
  available: number;
  imageUrl?: string;
};

type ProductImageRow = {
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

export type ProductDetail = {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  imageUrls: string[];
  variants: Variant[];
};

export async function fetchProductDetail(numericId: number, signal: AbortSignal): Promise<ProductDetail> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
          id,
          name,
          description,
          image_url,
          product_images(image_url, is_primary, display_order),
          product_variants(id, name, price, attributes, is_active, stock, reserved_stock)
        `
    )
    .abortSignal(signal)
    .eq('id', numericId)
    .single();

  if (error || !data) {
    const err = new Error(error?.message || 'Product not found') as APIError;
    err.status = error?.code === 'PGRST116' ? 404 : 500;
    err.info = error;
    throw err;
  }

  const legacyProductImage = (data as { image_url?: string | null }).image_url ?? null;
  const productImages = ((data as { product_images?: unknown[] }).product_images || []) as ProductImageRow[];
  const sortedProductImages = productImages
    .slice()
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.display_order - b.display_order;
    });
  const imageUrls = sortedProductImages.map((img) => img.image_url).filter(Boolean);
  const primaryImageUrl = imageUrls[0] ?? legacyProductImage ?? undefined;
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
        imageUrl: imageUrl ?? primaryImageUrl,
      };
    });

  return {
    id: Number((data as { id: number | string }).id),
    name: String((data as { name: string }).name),
    description: String((data as { description?: string | null }).description ?? ''),
    imageUrl: primaryImageUrl,
    imageUrls,
    variants: mappedVariants,
  };
}

export function useProduct(productId: string | undefined) {
  const numericId = Number(productId);
  const enabled = Number.isFinite(numericId);

  return useQuery({
    queryKey: enabled ? queryKeys.product(numericId) : ['product', 'invalid'],
    enabled,
    queryFn: ({ signal }) => fetchProductDetail(numericId, signal),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60000,
  });
}
