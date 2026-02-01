import { supabase } from '../lib/supabase';
import { bytesToMb } from './merchant';

type UploadProductImageOptions = {
  maxSizeMb?: number;
};

export async function uploadProductImage(file: File, productId: string, options: UploadProductImageOptions = {}): Promise<string> {
  const maxSizeMb = options.maxSizeMb ?? 2;
  
  // Cross-platform MIME type validation
  // Windows may return empty string for file.type, so we also check file extension
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
  const fileName = file.name.toLowerCase();
  const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(fileName);
  const hasValidMimeType = Boolean(file.type) && allowedTypes.has(file.type);
  
  // Accept if either MIME type OR extension is valid (defensive for Windows)
  if (!hasValidMimeType && !hasValidExtension) {
    throw new Error('Unsupported image type. Please upload a JPG, PNG, or WEBP file.');
  }

  if (bytesToMb(file.size) > maxSizeMb) {
    throw new Error(`Image is too large. Max size is ${maxSizeMb}MB.`);
  }

  // Determine extension from MIME type first, fallback to filename extension
  let ext = 'jpg';
  if (file.type === 'image/png') {
    ext = 'png';
  } else if (file.type === 'image/webp') {
    ext = 'webp';
  } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    ext = 'jpg';
  } else if (hasValidExtension) {
    // Fallback: extract from filename (for Windows where file.type might be empty)
    const match = fileName.match(/\.(jpe?g|png|webp)$/i);
    if (match) {
      ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    }
  }
  const uuid =
    globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const objectPath = `${productId}/${uuid}.${ext}`;

  let contentType: string | undefined;
  if (hasValidMimeType) {
    contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  } else if (ext === 'png') {
    contentType = 'image/png';
  } else if (ext === 'webp') {
    contentType = 'image/webp';
  } else if (ext === 'jpg') {
    contentType = 'image/jpeg';
  }

  const uploadOptions: { contentType?: string; cacheControl: string; upsert: boolean } = {
    cacheControl: '3600',
    upsert: false,
  };
  if (contentType) uploadOptions.contentType = contentType;

  const { error: uploadError } = await supabase.storage.from('product-images').upload(objectPath, file, uploadOptions);

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

/**
 * Upload multiple product images and save to product_images table
 * Returns array of uploaded image URLs
 */
export async function uploadProductImages(
  files: File[],
  productId: number,
  options: UploadProductImageOptions = {}
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadProductImage(file, String(productId), options));
  return Promise.all(uploadPromises);
}

/**
 * Save product images to database with display order
 */
export async function saveProductImages(
  productId: number,
  imageUrls: string[],
  startOrder: number = 0
): Promise<void> {
  const imageRecords = imageUrls.map((url, idx) => ({
    product_id: productId,
    image_url: url,
    display_order: startOrder + idx,
    is_primary: startOrder === 0 && idx === 0, // First image is primary if starting from 0
  }));

  const { error } = await supabase.from('product_images').insert(imageRecords);

  if (error) {
    throw new Error(`Failed to save product images: ${error.message}`);
  }
}

/**
 * Delete product image from storage and database
 */
export async function deleteProductImage(imageUrl: string, productId: number): Promise<void> {
  // Extract path from URL
  const url = new URL(imageUrl);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);
  
  if (!pathMatch) {
    throw new Error('Invalid image URL format');
  }

  const objectPath = pathMatch[1];

  // Delete from storage
  const { error: storageError } = await supabase.storage.from('product-images').remove([objectPath]);

  if (storageError) {
    console.error('Failed to delete from storage:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)
    .eq('image_url', imageUrl);

  if (dbError) {
    throw new Error(`Failed to delete image record: ${dbError.message}`);
  }
}
