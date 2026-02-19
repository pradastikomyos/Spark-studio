import { supabase } from '../lib/supabase';

const PRODUCT_IMAGE_PATH_PATTERN = /\/storage\/v1\/object\/public\/product-images\/(.+)$/;

const INVENTORY_THUMBNAIL_OPTIONS = {
  width: 640,
  resize: 'cover' as const,
  quality: 75,
};

export function toInventoryThumbUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;

  try {
    const parsedUrl = new URL(imageUrl);
    const pathMatch = parsedUrl.pathname.match(PRODUCT_IMAGE_PATH_PATTERN);
    if (!pathMatch) return imageUrl;

    const objectPath = decodeURIComponent(pathMatch[1]);
    if (!objectPath) return imageUrl;

    const { data } = supabase.storage.from('product-images').getPublicUrl(objectPath, {
      transform: INVENTORY_THUMBNAIL_OPTIONS,
    });

    return data.publicUrl || imageUrl;
  } catch {
    return imageUrl;
  }
}
