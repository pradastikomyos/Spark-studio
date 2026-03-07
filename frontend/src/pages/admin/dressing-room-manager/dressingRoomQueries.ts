import { supabase } from '../../../lib/supabase';
import { searchProductVariants } from '../../../utils/productVariantSearch';
import type {
  DressingRoomCollection,
  DressingRoomLook,
  DressingRoomLookItem,
  DressingRoomLookPhoto,
  ProductVariantOption,
} from './dressingRoomManagerTypes';

type JoinedProduct = {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
};

type JoinedVariant = {
  id: number;
  name: string;
  sku: string;
  price: number | null;
  products: JoinedProduct | JoinedProduct[] | null;
};

export async function fetchDressingRoomCollections(): Promise<DressingRoomCollection[]> {
  const { data, error } = await supabase
    .from('dressing_room_collections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DressingRoomCollection[];
}

export async function fetchDressingRoomLooks(collectionId: number): Promise<DressingRoomLook[]> {
  const { data: looksData, error: looksError } = await supabase
    .from('dressing_room_looks')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (looksError) throw looksError;
  if (!looksData || looksData.length === 0) return [];

  const lookIds = looksData.map((look) => look.id);
  const { data: photosData, error: photosError } = await supabase
    .from('dressing_room_look_photos')
    .select('id, look_id, image_url, label, sort_order')
    .in('look_id', lookIds)
    .order('sort_order', { ascending: true });
  if (photosError) throw photosError;

  const photosByLook = new Map<number, DressingRoomLookPhoto[]>();
  (photosData ?? []).forEach((raw) => {
    const list = photosByLook.get(raw.look_id) ?? [];
    list.push({
      id: raw.id,
      look_id: raw.look_id,
      image_url: raw.image_url,
      label: raw.label ?? null,
      sort_order: raw.sort_order,
    });
    photosByLook.set(raw.look_id, list);
  });

  const { data: itemsData, error: itemsError } = await supabase
    .from('dressing_room_look_items')
    .select(
      `id, look_id, product_variant_id, label, sort_order,
        product_variants!inner ( id, name, sku, price, products!inner ( id, name, slug, image_url ) )`
    )
    .in('look_id', lookIds)
    .order('sort_order', { ascending: true });
  if (itemsError) throw itemsError;

  const allItems: DressingRoomLookItem[] = [];
  const itemsByLook = new Map<number, DressingRoomLookItem[]>();
  (itemsData ?? []).forEach((raw) => {
    const list = itemsByLook.get(raw.look_id) ?? [];
    const productVariantRaw = raw.product_variants as JoinedVariant | JoinedVariant[] | null;
    const productVariant = Array.isArray(productVariantRaw) ? (productVariantRaw[0] ?? null) : productVariantRaw;
    const productRaw = productVariant?.products ?? null;
    const product = Array.isArray(productRaw) ? (productRaw[0] ?? null) : productRaw;
    const item: DressingRoomLookItem = {
      id: raw.id,
      look_id: raw.look_id,
      product_variant_id: raw.product_variant_id,
      label: raw.label as string | null,
      sort_order: raw.sort_order,
      resolved_image_url: null,
      product_variant: productVariant
        ? {
            id: productVariant.id,
            name: productVariant.name,
            sku: productVariant.sku,
            price: productVariant.price,
            product: product
              ? {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  image_url: product.image_url,
                }
              : null,
          }
        : null,
    };
    list.push(item);
    allItems.push(item);
    itemsByLook.set(raw.look_id, list);
  });

  const productIds = [...new Set(allItems.map((item) => item.product_variant?.product?.id).filter(Boolean))] as number[];
  if (productIds.length > 0) {
    const { data: imgData } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .in('product_id', productIds)
      .eq('is_primary', true);
    if (imgData) {
      const imgMap = new Map<number, string>();
      imgData.forEach((image) => imgMap.set(image.product_id, image.image_url));
      allItems.forEach((item) => {
        const productId = item.product_variant?.product?.id;
        if (productId) {
          item.resolved_image_url = imgMap.get(productId) || item.product_variant?.product?.image_url || null;
        }
      });
    }
  }

  return looksData.map((look) => ({
    id: look.id,
    collection_id: look.collection_id,
    look_number: look.look_number,
    model_image_url: look.model_image_url,
    model_name: look.model_name,
    sort_order: look.sort_order,
    photos:
      photosByLook.get(look.id) ||
      (look.model_image_url
        ? [
            {
              id: -Number(look.id),
              look_id: Number(look.id),
              image_url: String(look.model_image_url),
              label: null,
              sort_order: 0,
            },
          ]
        : []),
    items: itemsByLook.get(look.id) || [],
  }));
}

export async function searchDressingRoomProducts(query: string): Promise<ProductVariantOption[]> {
  const results = await searchProductVariants(query, 10);
  return results.map((result) => ({
    id: result.id,
    name: result.name,
    sku: result.sku,
    price: result.price,
    product_name: result.productName,
    product_id: result.productId,
  }));
}
