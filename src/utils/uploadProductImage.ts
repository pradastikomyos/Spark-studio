import { supabase } from '../lib/supabase';
import { bytesToMb } from './merchant';

type UploadProductImageOptions = {
  maxSizeMb?: number;
};

export async function uploadProductImage(file: File, productId: string, options: UploadProductImageOptions = {}): Promise<string> {
  const maxSizeMb = options.maxSizeMb ?? 2;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  if (!allowedTypes.has(file.type)) {
    throw new Error('Unsupported image type. Please upload a JPG, PNG, or WEBP file.');
  }

  if (bytesToMb(file.size) > maxSizeMb) {
    throw new Error(`Image is too large. Max size is ${maxSizeMb}MB.`);
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const uuid =
    globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const objectPath = `${productId}/${uuid}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('product-images').upload(objectPath, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    const message = uploadError.message || 'Failed to upload image';
    if (message.toLowerCase().includes('bucket') && message.toLowerCase().includes('not found')) {
      throw new Error('Storage bucket "product-images" not found. Create it in Supabase Storage, then try again.');
    }
    throw new Error(message);
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  return publicUrl;
}
