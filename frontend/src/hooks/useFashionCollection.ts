import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FashionLookItem {
    id: number;
    look_id: number;
    product_variant_id: number;
    label: string | null;
    sort_order: number;
    product_variant: {
        id: number;
        name: string;
        sku: string;
        price: number | null;
        product: {
            id: number;
            name: string;
            slug: string;
            image_url: string | null;
        };
    } | null;
    resolved_image_url: string | null;
}

export interface FashionLook {
    id: number;
    collection_id: number;
    look_number: number;
    model_image_url: string;
    model_name: string | null;
    sort_order: number;
    items: FashionLookItem[];
}

export interface FashionCollection {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    sort_order: number;
}

async function fetchFashionCollection(slug?: string) {
    // Fetch collection — either by slug or the first active one
    let collectionQuery = supabase
        .from('fashion_collections')
        .select('*')
        .eq('is_active', true);

    if (slug) {
        collectionQuery = collectionQuery.eq('slug', slug);
    } else {
        collectionQuery = collectionQuery.order('sort_order', { ascending: true }).limit(1);
    }

    const { data: collections, error: collectionError } = await collectionQuery;

    if (collectionError) throw collectionError;
    if (!collections || collections.length === 0) return { collection: null, looks: [] };

    const collection = collections[0] as FashionCollection;

    // Fetch looks for this collection
    const { data: looks, error: looksError } = await supabase
        .from('fashion_looks')
        .select('*')
        .eq('collection_id', collection.id)
        .order('sort_order', { ascending: true });

    if (looksError) throw looksError;

    if (!looks || looks.length === 0) {
        return { collection, looks: [] };
    }

    // Fetch look items with product variant + product info
    const lookIds = looks.map((l) => l.id);
    const { data: items, error: itemsError } = await supabase
        .from('fashion_look_items')
        .select(`
      id,
      look_id,
      product_variant_id,
      label,
      sort_order,
      product_variants!inner (
        id,
        name,
        sku,
        price,
        products!inner (
          id,
          name,
          slug,
          image_url
        )
      )
    `)
        .in('look_id', lookIds)
        .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Build look items map
    const itemsByLook = new Map<number, FashionLookItem[]>();

    // Collect all product IDs to fetch primary images from product_images table
    const allProductIds = new Set<number>();
    if (items) {
        for (const item of items) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = item as any;
            if (raw.product_variants?.products?.id) {
                allProductIds.add(raw.product_variants.products.id);
            }
        }
    }

    // Fetch primary images for all products in one query
    const productImageMap = new Map<number, string>();
    if (allProductIds.size > 0) {
        const { data: imgData } = await supabase
            .from('product_images')
            .select('product_id, image_url')
            .in('product_id', Array.from(allProductIds))
            .eq('is_primary', true)
            .limit(allProductIds.size);
        if (imgData) {
            for (const img of imgData) {
                productImageMap.set(img.product_id as number, img.image_url as string);
            }
        }
    }

    if (items) {
        for (const item of items) {
            const lookItems = itemsByLook.get(item.look_id) || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = item as any;
            const productId = raw.product_variants?.products?.id;
            const productImageUrl = raw.product_variants?.products?.image_url;
            const primaryImage = productId ? productImageMap.get(productId) : null;

            lookItems.push({
                id: raw.id,
                look_id: raw.look_id,
                product_variant_id: raw.product_variant_id,
                label: raw.label,
                sort_order: raw.sort_order,
                resolved_image_url: primaryImage || productImageUrl || null,
                product_variant: raw.product_variants ? {
                    id: raw.product_variants.id,
                    name: raw.product_variants.name,
                    sku: raw.product_variants.sku,
                    price: raw.product_variants.price,
                    product: raw.product_variants.products ? {
                        id: raw.product_variants.products.id,
                        name: raw.product_variants.products.name,
                        slug: raw.product_variants.products.slug,
                        image_url: raw.product_variants.products.image_url,
                    } : null as never,
                } : null,
            });
            itemsByLook.set(item.look_id, lookItems);
        }
    }

    const fashionLooks: FashionLook[] = looks.map((look) => ({
        id: look.id,
        collection_id: look.collection_id,
        look_number: look.look_number,
        model_image_url: look.model_image_url,
        model_name: look.model_name,
        sort_order: look.sort_order,
        items: itemsByLook.get(look.id) || [],
    }));

    return { collection, looks: fashionLooks };
}

export function useFashionCollection(slug?: string) {
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['fashion-collection', slug ?? '__default__'],
        queryFn: () => fetchFashionCollection(slug),
        staleTime: 5 * 60 * 1000,
    });

    return {
        collection: data?.collection ?? null,
        looks: data?.looks ?? [],
        isLoading,
        error,
        refetch,
    };
}
