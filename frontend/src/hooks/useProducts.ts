import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

/**
 * Product interface matching the Shop page requirements
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
  placeholder?: string;
  categorySlug?: string | null;
  defaultVariantId?: number;
  defaultVariantName?: string;
}

/**
 * Transform raw Supabase product data into Product interface
 */
type ProductVariantRow = {
  id: unknown;
  name?: unknown;
  price?: unknown;
  attributes?: unknown;
  is_active?: unknown;
  stock?: unknown;
  reserved_stock?: unknown;
};

type ProductImageRow = {
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

type ProductRow = {
  id: unknown;
  name?: unknown;
  description?: unknown;
  categories?: { slug?: unknown } | null;
  product_variants?: unknown;
  product_images?: ProductImageRow[];
};

const toNumber = (value: unknown, fallback: number = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

function transformProduct(row: ProductRow): Product {
  const variants: ProductVariantRow[] = Array.isArray(row.product_variants) ? (row.product_variants as ProductVariantRow[]) : [];

  let priceMin = Number.POSITIVE_INFINITY;
  let image: string | undefined;
  let defaultVariantId: number | undefined;
  let defaultVariantName: string | undefined;
  let defaultVariantPrice = Number.POSITIVE_INFINITY;

  // Get primary image from product_images table
  const sortedImages = (row.product_images || [])
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.display_order - b.display_order;
    });
  if (sortedImages[0]?.image_url) image = sortedImages[0].image_url;

  // Process variants to find minimum price and default variant
  for (const v of variants) {
    if (v.is_active === false) continue;

    const price = toNumber(v.price, 0);
    if (Number.isFinite(price)) priceMin = Math.min(priceMin, price);

    // Use variant image if product image not available
    if (!image) {
      const attrs =
        v.attributes && typeof v.attributes === 'object' && !Array.isArray(v.attributes)
          ? (v.attributes as Record<string, unknown>)
          : null;
      const maybeImage = attrs && typeof attrs.image_url === 'string' ? attrs.image_url : null;
      if (maybeImage) image = maybeImage;
    }

    // Find default variant (first available variant with lowest price)
    const available = toNumber(v.stock, 0) - toNumber(v.reserved_stock, 0);
    const isAvailable = available > 0;
    if (isAvailable && Number.isFinite(price) && price >= 0 && price < defaultVariantPrice) {
      defaultVariantPrice = price;
      defaultVariantId = toNumber(v.id, 0);
      defaultVariantName = typeof v.name === 'string' ? v.name : String(v.name ?? '');
    }
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  const categorySlug = typeof row.categories?.slug === 'string' ? row.categories.slug : null;

  return {
    id: toNumber(row.id, 0),
    name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : String(row.description ?? ''),
    price: priceMin,
    image,
    placeholder: image ? undefined : 'inventory_2',
    categorySlug,
    defaultVariantId,
    defaultVariantName,
  };
}

/**
 * Custom SWR hook for fetching products
 * 
 * Features:
 * - Fetches all active products with variants and categories
 * - Transforms raw data into Product interface
 * - Caches results for 1 minute (dedupingInterval)
 * - Does not revalidate on focus (product data is relatively static)
 * - Automatic retry on error with exponential backoff
 * 
 * @param categorySlug - Optional category filter (client-side filtering)
 * @returns SWR response with products data, error, loading states, and mutate function
 * 
 * @example
 * const { data: products, error, isLoading } = useProducts();
 * 
 * @example
 * // With category filter (client-side)
 * const { data: products } = useProducts();
 * const filtered = products?.filter(p => p.categorySlug === 'apparel');
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products(),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            `
            id,
            name,
            description,
            is_active,
            deleted_at,
            categories(name, slug),
            product_images(image_url, is_primary, display_order),
            product_variants(id, name, price, attributes, is_active, stock, reserved_stock)
          `
          )
          .abortSignal(timeoutSignal)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          const err = new Error(error.message) as APIError;
          err.status = error.code === 'PGRST116' ? 404 : 500;
          err.info = error;
          throw err;
        }

        return (data || []).map((row) => transformProduct(row as unknown as ProductRow));
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
