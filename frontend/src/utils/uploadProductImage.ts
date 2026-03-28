import { supabase } from '../lib/supabase';
import { deleteImageKitFile, type ProductImageRecordInput, uploadFileToImageKit } from '../lib/imagekit';
import { bytesToMb } from './merchant';
import { MAX_PRODUCT_IMAGE_SIZE_MB, PRODUCT_IMAGE_UPLOAD_CONCURRENCY } from '../constants/productImages';

type UploadProductImageOptions = {
  accessToken?: string;
  maxSizeMb?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  concurrency?: number;
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

function isMissingRemoteFileError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('404') || normalized.includes('not found') || normalized.includes('no object');
}

export type ProductImageDeleteInput = {
  id?: number;
  image_url: string;
  image_provider?: 'supabase' | 'imagekit';
  provider_file_id?: string | null;
  provider_file_path?: string | null;
};

export async function uploadProductImage(
  file: File,
  productId: string,
  options: UploadProductImageOptions = {}
): Promise<ProductImageRecordInput> {
  const maxSizeMb = options.maxSizeMb ?? MAX_PRODUCT_IMAGE_SIZE_MB;
  const timeoutMs = options.timeoutMs ?? 120000;
  const accessToken = options.accessToken?.trim();
  
  // Cross-platform MIME type validation
  // Windows may return empty string for file.type, so we also check file extension
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
  const normalizedFileName = file.name.toLowerCase();
  const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(normalizedFileName);
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
    const match = normalizedFileName.match(/\.(jpe?g|png|webp)$/i);
    if (match) {
      ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    }
  }
  const uuid =
    globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (!accessToken) {
    throw new Error('Missing access token for ImageKit upload.');
  }

  const fileName = `${uuid}.${ext}`;

  return withTimeout(
    uploadFileToImageKit({
      accessToken,
      file,
      fileName,
      productId,
    }),
    timeoutMs,
    'Upload gambar terlalu lama (timeout). Coba lagi saat koneksi lebih stabil.'
  );
}

/**
 * Upload multiple product images and save to product_images table
 * Returns array of uploaded image records
 */
export async function uploadProductImages(
  files: File[],
  productId: number,
  options: UploadProductImageOptions = {}
): Promise<ProductImageRecordInput[]> {
  const maxAttempts = options.retryAttempts ?? 3;
  const baseDelayMs = options.retryDelayMs ?? 1000;
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? PRODUCT_IMAGE_UPLOAD_CONCURRENCY));
  const uploadWithRetry = async (file: File): Promise<ProductImageRecordInput> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await uploadProductImage(file, String(productId), options);
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts - 1) break;
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    if (lastError instanceof Error) throw lastError;
    throw new Error('Failed to upload image');
  };

  if (files.length === 0) return [];
  if (concurrency >= files.length) {
    const uploadPromises = files.map((file) => uploadWithRetry(file));
    return Promise.all(uploadPromises);
  }

  const results = new Array<ProductImageRecordInput>(files.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= files.length) break;
      results[current] = await uploadWithRetry(files[current]);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Save product images to database with display order
 */
export async function saveProductImages(
  productId: number,
  imageRecordsInput: ProductImageRecordInput[],
  startOrder: number = 0
): Promise<void> {
  const nowIso = new Date().toISOString();
  const imageRecords = imageRecordsInput.map((image, idx) => ({
    product_id: productId,
    image_url: image.image_url,
    image_provider: image.image_provider,
    provider_file_id: image.provider_file_id,
    provider_file_path: image.provider_file_path,
    provider_original_url: image.provider_original_url,
    migrated_at: image.image_provider === 'imagekit' ? nowIso : null,
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
export async function deleteProductImage(
  image: ProductImageDeleteInput,
  productId: number,
  options: { accessToken?: string } = {}
): Promise<void> {
  const provider = image.image_provider ?? (image.provider_file_id ? 'imagekit' : 'supabase');
  if (provider === 'imagekit') {
    const fileId = image.provider_file_id?.trim();
    const accessToken = options.accessToken?.trim();
    if (!fileId) {
      throw new Error('ImageKit file id is missing for this product image.');
    }
    if (!accessToken) {
      throw new Error('Missing access token for ImageKit deletion.');
    }
    try {
      await deleteImageKitFile({ accessToken, fileId, productImageId: image.id ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete ImageKit file';
      if (!isMissingRemoteFileError(message)) {
        throw new Error(message);
      }
      console.warn('ImageKit file already missing, continuing DB delete:', message);
    }
  } else {
    console.warn('Skipping legacy Supabase storage delete for product image; storage bucket has been retired.');
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)
    .eq('image_url', image.image_url);

  if (dbError) {
    throw new Error(`Failed to delete image record: ${dbError.message}`);
  }
}
