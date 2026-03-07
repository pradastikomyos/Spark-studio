import { supabase } from '../../../lib/supabase';
import { clampPercent } from '../../../utils/dragPosition';
import { slugify } from '../../../utils/merchant';
import { asRecord } from './beautyPosterHelpers';
import type { BeautyPosterRow, TagDraft } from './beautyPosterTypes';

export async function fetchBeautyPosters(): Promise<BeautyPosterRow[]> {
  const { data, error } = await supabase
    .from('beauty_posters')
    .select('id, title, slug, description, image_url, is_active, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BeautyPosterRow[];
}

export async function fetchBeautyPosterTags(poster: BeautyPosterRow): Promise<TagDraft[]> {
  const { data: rawTags, error } = await supabase
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
          products!inner ( id, name, image_url )
        )
      `
    )
    .eq('poster_id', poster.id)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const productIds = new Set<number>();
  (rawTags ?? []).forEach((row) => {
    const record = asRecord(row);
    const variant = asRecord(record?.product_variants);
    const product = asRecord(variant?.products);
    const productId = product?.id;
    if (typeof productId === 'number') productIds.add(productId);
  });

  const productImageMap = new Map<number, string>();
  if (productIds.size > 0) {
    const { data: imgData } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .in('product_id', Array.from(productIds))
      .eq('is_primary', true);

    (imgData ?? []).forEach((image) => {
      if (typeof image.product_id === 'number' && typeof image.image_url === 'string') {
        productImageMap.set(image.product_id, image.image_url);
      }
    });
  }

  return (rawTags ?? []).map((row) => {
    const record = asRecord(row) ?? {};
    const variant = asRecord(record.product_variants);
    const product = asRecord(variant?.products);
    const attributes = asRecord(variant?.attributes);
    const variantImage = typeof attributes?.image_url === 'string' ? attributes.image_url : null;
    const rawProductId = product?.id;
    const productId =
      typeof rawProductId === 'number' ? rawProductId : typeof rawProductId === 'string' ? Number(rawProductId) : Number.NaN;
    const primary = Number.isFinite(productId) ? productImageMap.get(productId) ?? null : null;

    return {
      id: Number(record.id),
      product_variant_id: Number(record.product_variant_id),
      product_id: Number(product?.id),
      product_name: String(product?.name ?? ''),
      variant_name: String(variant?.name ?? ''),
      image_url: variantImage ?? primary ?? ((product?.image_url as string | null | undefined) ?? null),
      label: (record.label ?? null) as string | null,
      x_pct: typeof record.x_pct === 'number' ? record.x_pct : Number(record.x_pct),
      y_pct: typeof record.y_pct === 'number' ? record.y_pct : Number(record.y_pct),
      size_pct: typeof record.size_pct === 'number' ? record.size_pct : Number(record.size_pct ?? 6),
      is_placed: true,
      sort_order: Number(record.sort_order ?? 0),
    } satisfies TagDraft;
  });
}

export function createBeautyPosterSnapshot(params: {
  posterId: number | null;
  title: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  tags: TagDraft[];
}) {
  const { posterId, title, slug, imageUrl, isActive, tags } = params;
  return JSON.stringify({
    posterId,
    title: title.trim(),
    slug: slug.trim(),
    imageUrl: imageUrl.trim(),
    isActive,
    tags: tags
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((tag) => ({
        product_variant_id: tag.product_variant_id,
        label: tag.label && tag.label.trim().length ? tag.label.trim() : null,
        x_pct: clampPercent(tag.x_pct),
        y_pct: clampPercent(tag.y_pct),
        size_pct: typeof tag.size_pct === 'number' ? tag.size_pct : 6,
        is_placed: Boolean(tag.is_placed),
        sort_order: tag.sort_order,
      })),
  });
}

export async function uploadBeautyPosterImage(params: {
  file: File;
  slug: string;
  title: string;
}): Promise<string> {
  const { file, slug, title } = params;
  const ext = file.name.split('.').pop() || 'jpg';
  const safeSlug = slug.trim() ? slug.trim() : slugify(title || 'beauty-poster');
  const fileName = `beauty-${safeSlug}-${Date.now()}.${ext}`;
  const filePath = `posters/${fileName}`;

  const { error } = await supabase.storage.from('beauty-images').upload(filePath, file, { upsert: true });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('beauty-images').getPublicUrl(filePath);
  return publicUrl;
}

export async function saveBeautyPoster(params: {
  selectedPosterId: number | null;
  title: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  postersLength: number;
  tags: TagDraft[];
}): Promise<BeautyPosterRow> {
  const { selectedPosterId, title, slug, imageUrl, isActive, postersLength, tags } = params;
  let posterId = selectedPosterId;

  if (posterId == null) {
    const { data, error } = await supabase
      .from('beauty_posters')
      .insert({
        title: title.trim(),
        slug: slug.trim(),
        image_url: imageUrl.trim(),
        is_active: isActive,
        sort_order: postersLength,
      })
      .select('id')
      .single();
    if (error) throw error;
    posterId = Number((data as { id: number | string }).id);
  } else {
    const { error } = await supabase
      .from('beauty_posters')
      .update({
        title: title.trim(),
        slug: slug.trim(),
        image_url: imageUrl.trim(),
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', posterId);
    if (error) throw error;
  }

  const { error: deleteError } = await supabase.from('beauty_poster_tags').delete().eq('poster_id', posterId);
  if (deleteError) throw deleteError;

  if (tags.length > 0) {
    const rows = tags
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((tag, index) => ({
        poster_id: posterId,
        product_variant_id: tag.product_variant_id,
        label: tag.label && tag.label.trim().length ? tag.label.trim() : null,
        x_pct: clampPercent(tag.x_pct),
        y_pct: clampPercent(tag.y_pct),
        size_pct: typeof tag.size_pct === 'number' ? tag.size_pct : 6,
        sort_order: index,
      }));
    const { error: insertError } = await supabase.from('beauty_poster_tags').insert(rows);
    if (insertError) throw insertError;
  }

  const { data: posterRow, error: posterLoadError } = await supabase
    .from('beauty_posters')
    .select('id, title, slug, description, image_url, is_active, sort_order')
    .eq('id', posterId)
    .single();
  if (posterLoadError) throw posterLoadError;

  return posterRow as BeautyPosterRow;
}
