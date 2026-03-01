import { supabase } from '../lib/supabase';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export type ProductVariantSearchResult = {
  id: number;
  name: string;
  sku: string;
  price: number | null;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  variantImageUrl: string | null;
};

export async function searchProductVariants(query: string, limit = 12): Promise<ProductVariantSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, name, sku, price, attributes, products!inner ( id, name, image_url )')
    .ilike('name', `%${q}%`)
    .eq('is_active', true)
    .limit(limit);

  if (error) throw error;

  const productIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => {
          const r = asRecord(row);
          const prod = asRecord(r?.products);
          return prod?.id;
        })
        .filter((id): id is number => typeof id === 'number')
    )
  ) as number[];

  const primaryImageMap = new Map<number, string>();
  if (productIds.length > 0) {
    const { data: imgData } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .in('product_id', productIds)
      .eq('is_primary', true);
    (imgData ?? []).forEach((img) => {
      if (typeof img.product_id === 'number' && typeof img.image_url === 'string') {
        primaryImageMap.set(img.product_id, img.image_url);
      }
    });
  }

  return (data ?? []).map((row) => {
    const r = asRecord(row) ?? {};
    const prod = asRecord(r.products) ?? {};
    const attributes = asRecord(r.attributes);
    const variantImage = typeof attributes?.image_url === 'string' ? attributes.image_url : null;
    const productId = Number(prod.id);
    const primary = primaryImageMap.get(productId) ?? null;
    const productImageUrl = typeof prod.image_url === 'string' ? prod.image_url : null;

    return {
      id: Number(r.id),
      name: String(r.name),
      sku: String(r.sku),
      price: r.price === null || r.price === undefined ? null : Number(r.price),
      productId,
      productName: String(prod.name ?? ''),
      productImageUrl: primary ?? productImageUrl,
      variantImageUrl: variantImage,
    } satisfies ProductVariantSearchResult;
  });
}
