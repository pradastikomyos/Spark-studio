import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { supabasePaginatedFetcher, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export interface ProductSummary {
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

export interface ProductPickerOption {
  id: number;
  name: string;
  price: number;
  image?: string;
  placeholder?: string;
  categorySlug?: string | null;
}

export type Product = ProductSummary;

type ProductVariantRow = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  is_active?: unknown;
  stock?: unknown;
  reserved_stock?: unknown;
};

type ProductImageRow = {
  image_url?: unknown;
  is_primary?: unknown;
  display_order?: unknown;
};

type ProductRow = {
  id: unknown;
  name?: unknown;
  description?: unknown;
  categories?: { slug?: unknown } | null;
  product_variants?: unknown;
  product_images?: ProductImageRow[];
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

function getPrimaryImage(productImages: ProductImageRow[] | undefined) {
  if (!Array.isArray(productImages) || productImages.length === 0) return undefined;

  const normalizedImages = productImages
    .map((image) => ({
      image_url: typeof image.image_url === 'string' ? image.image_url : '',
      is_primary: Boolean(image.is_primary),
      display_order: toNumber(image.display_order, 0),
    }))
    .filter((image) => image.image_url);

  if (normalizedImages.length === 0) return undefined;

  const primary = normalizedImages.find((image) => image.is_primary);
  if (primary) return primary.image_url;

  return normalizedImages.reduce((lowest, current) =>
    lowest.display_order <= current.display_order ? lowest : current
  ).image_url;
}

function getActiveVariants(value: unknown): ProductVariantRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((variant): variant is ProductVariantRow => Boolean(variant));
}

function transformProductSummary(row: ProductRow): ProductSummary {
  const variants = getActiveVariants(row.product_variants);
  const image = getPrimaryImage(row.product_images);
  let priceMin = Number.POSITIVE_INFINITY;
  let defaultVariantId: number | undefined;
  let defaultVariantName: string | undefined;
  let defaultVariantPrice = Number.POSITIVE_INFINITY;

  for (const variant of variants) {
    if (variant.is_active === false) continue;

    const price = toNumber(variant.price, 0);
    if (Number.isFinite(price)) {
      priceMin = Math.min(priceMin, price);
    }

    const available = toNumber(variant.stock, 0) - toNumber(variant.reserved_stock, 0);
    if (available > 0 && price >= 0 && price < defaultVariantPrice) {
      defaultVariantPrice = price;
      defaultVariantId = toNumber(variant.id, 0);
      defaultVariantName = typeof variant.name === 'string' ? variant.name : String(variant.name ?? '');
    }
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  return {
    id: toNumber(row.id, 0),
    name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : String(row.description ?? ''),
    price: priceMin,
    image,
    placeholder: image ? undefined : 'inventory_2',
    categorySlug: typeof row.categories?.slug === 'string' ? row.categories.slug : null,
    defaultVariantId,
    defaultVariantName,
  };
}

function transformProductPickerOption(row: ProductRow): ProductPickerOption {
  const variants = getActiveVariants(row.product_variants);
  let priceMin = Number.POSITIVE_INFINITY;

  for (const variant of variants) {
    if (variant.is_active === false) continue;
    const price = toNumber(variant.price, 0);
    if (Number.isFinite(price)) {
      priceMin = Math.min(priceMin, price);
    }
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  const image = getPrimaryImage(row.product_images);

  return {
    id: toNumber(row.id, 0),
    name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
    price: priceMin,
    image,
    placeholder: image ? undefined : 'inventory_2',
    categorySlug: typeof row.categories?.slug === 'string' ? row.categories.slug : null,
  };
}

async function fetchProductSummaries(signal?: AbortSignal) {
  const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);

  try {
    const rows = await supabasePaginatedFetcher<ProductRow>(
      (from, to) =>
        supabase
          .from('products')
          .select(
            `
            id,
            name,
            description,
            categories(slug),
            product_images(image_url, is_primary, display_order),
            product_variants(id, name, price, is_active, stock, reserved_stock)
          `
          )
          .abortSignal(timeoutSignal)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .range(from, to),
      1000
    );

    return rows.map(transformProductSummary);
  } catch (error) {
    if (didTimeout()) {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    cleanup();
  }
}

async function fetchProductPickerOptions(signal?: AbortSignal) {
  const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);

  try {
    const rows = await supabasePaginatedFetcher<ProductRow>(
      (from, to) =>
        supabase
          .from('products')
          .select(
            `
            id,
            name,
            categories(slug),
            product_images(image_url, is_primary, display_order),
            product_variants(price, is_active)
          `
          )
          .abortSignal(timeoutSignal)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .range(from, to),
      1000
    );

    return rows.map(transformProductPickerOption);
  } catch (error) {
    if (didTimeout()) {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    cleanup();
  }
}

export function useProductSummaries() {
  return useQuery({
    queryKey: queryKeys.productSummaries(),
    queryFn: ({ signal }) => fetchProductSummaries(signal),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useProductPickerOptions() {
  return useQuery({
    queryKey: queryKeys.productPickerOptions(),
    queryFn: ({ signal }) => fetchProductPickerOptions(signal),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useProducts() {
  return useProductSummaries();
}
