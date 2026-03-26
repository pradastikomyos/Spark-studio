import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export type BeautyPosterTag = {
  id: number;
  poster_id: number;
  product_variant_id: number;
  label: string | null;
  x_pct: number;
  y_pct: number;
  size_pct: number;
  sort_order: number;
  product_variant: {
    id: number;
    name: string;
    sku: string;
    price: number | null;
    attributes: Record<string, unknown> | null;
    product: {
      id: number;
      name: string;
      slug: string;
      image_url: string | null;
    };
  } | null;
  resolved_image_url: string | null;
};

export type BeautyPoster = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

async function fetchBeautyPoster(slug: string) {
  const { data: posters, error: posterError } = await supabase
    .from('beauty_posters')
    .select('id, title, slug, description, image_url, is_active, sort_order')
    .eq('slug', slug)
    .eq('is_active', true)
    .limit(1);

  if (posterError) throw posterError;
  const poster = (posters?.[0] ?? null) as BeautyPoster | null;
  if (!poster) return { poster: null, tags: [] as BeautyPosterTag[] };

  const { data: rawTags, error: tagsError } = await supabase
    .from('beauty_poster_tags')
    .select(
      `
        id,
        poster_id,
        product_variant_id,
        label,
        x_pct,
        y_pct,
        size_pct,
        sort_order,
        product_variants!inner (
          id,
          name,
          sku,
          price,
          attributes,
          products!inner (
            id,
            name,
            slug,
            image_url
          )
        )
      `
    )
    .eq('poster_id', poster.id)
    .order('sort_order', { ascending: true });

  if (tagsError) throw tagsError;

  // Single-pass: collect product IDs and pre-parse record structures
  type ParsedTagEntry = {
    t: Record<string, unknown>;
    pv: Record<string, unknown> | null;
    prod: Record<string, unknown> | null;
    productId: number | undefined;
  };
  const parsedEntries: ParsedTagEntry[] = [];
  const productIds = new Set<number>();

  for (const tag of rawTags ?? []) {
    const t = asRecord(tag) ?? {};
    const pv = asRecord(t.product_variants);
    const prod = asRecord(pv?.products);
    const productId = typeof prod?.id === 'number' ? prod.id : undefined;
    if (productId !== undefined) productIds.add(productId);
    parsedEntries.push({ t, pv, prod, productId });
  }

  const productImageMap = new Map<number, string>();
  if (productIds.size > 0) {
    const { data: imgData } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .in('product_id', Array.from(productIds))
      .eq('is_primary', true)
      .limit(productIds.size);
    (imgData ?? []).forEach((img) => {
      productImageMap.set(img.product_id as number, img.image_url as string);
    });
  }

  const tags: BeautyPosterTag[] = parsedEntries.map(({ t, pv, prod, productId }) => {
    const productImageUrl = typeof prod?.image_url === 'string' ? prod.image_url : null;
    const primary = productId ? productImageMap.get(productId) ?? null : null;
    const attributes = asRecord(pv?.attributes);
    const variantImage = typeof attributes?.image_url === 'string' ? attributes.image_url : null;

    return {
      id: Number(t.id),
      poster_id: Number(t.poster_id),
      product_variant_id: Number(t.product_variant_id),
      label: (t.label ?? null) as string | null,
      x_pct: typeof t.x_pct === 'number' ? t.x_pct : Number(t.x_pct),
      y_pct: typeof t.y_pct === 'number' ? t.y_pct : Number(t.y_pct),
      size_pct: typeof t.size_pct === 'number' ? t.size_pct : Number(t.size_pct ?? 6),
      sort_order: Number(t.sort_order ?? 0),
      resolved_image_url: variantImage ?? primary ?? productImageUrl ?? null,
      product_variant: pv
        ? {
            id: Number(pv.id),
            name: String(pv.name),
            sku: String(pv.sku),
            price: pv.price === null || pv.price === undefined ? null : Number(pv.price),
            attributes: (attributes ?? null) as Record<string, unknown> | null,
            product: {
              id: Number(prod?.id),
              name: String(prod?.name ?? ''),
              slug: String(prod?.slug ?? ''),
              image_url: productImageUrl,
            },
          }
        : null,
    };
  });

  return { poster, tags };
}

export function useBeautyPoster(slug: string | undefined) {
  const enabled = Boolean(slug && slug.trim().length > 0);
  return useQuery({
    queryKey: ['beauty-poster', slug ?? '__missing__'],
    enabled,
    queryFn: () => fetchBeautyPoster(String(slug)),
    staleTime: 5 * 60 * 1000,
  });
}
