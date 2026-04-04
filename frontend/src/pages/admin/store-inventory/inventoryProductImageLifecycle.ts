import type { ProductImageRecordInput } from '../../../lib/imagekit';
import {
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
} from '../../../constants/productImages';
import { uploadProductImage } from '../../../utils/uploadProductImage';

export const extractInventoryMutationErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [maybe.message, maybe.details, maybe.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 2);
    if (parts.length > 0) return parts.join(' • ');
    if (typeof maybe.code === 'string' && maybe.code.trim().length > 0) return `Error code: ${maybe.code}`;
  }
  return fallback;
};

export const formatInventoryCleanupWarningSuffix = (warnings: string[]) =>
  warnings.length > 0 ? `; cleanup warnings: ${warnings.join(' | ')}` : '';

export const extractImageKitFileIds = (images: ProductImageRecordInput[]) =>
  [
    ...new Set(
      images
        .filter((image) => image.image_provider === 'imagekit' && typeof image.provider_file_id === 'string')
        .map((image) => image.provider_file_id?.trim() ?? '')
        .filter((fileId) => fileId.length > 0)
    ),
  ];

type CleanupImages = (images: ProductImageRecordInput[]) => Promise<{
  cleanedCount: number;
  cleanupWarnings: string[];
}>;

export async function uploadInventoryImagesWithRollback(params: {
  files: File[];
  productId: number;
  accessToken: string;
  cleanupImages: CleanupImages;
}): Promise<ProductImageRecordInput[]> {
  const { files, productId, accessToken, cleanupImages } = params;
  const uploadedImages: ProductImageRecordInput[] = [];

  try {
    for (const file of files) {
      const image = await uploadProductImage(file, String(productId), {
        accessToken,
        maxSizeMb: MAX_PRODUCT_IMAGE_SIZE_MB,
        timeoutMs: PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
      });
      uploadedImages.push(image);
    }
    return uploadedImages;
  } catch (error) {
    const cleanup = await cleanupImages(uploadedImages).catch((cleanupError) => ({
      cleanedCount: 0,
      cleanupWarnings: [extractInventoryMutationErrorMessage(cleanupError, 'Failed to clean up uploaded images')],
    }));

    const cleanupSuffix = cleanup.cleanedCount > 0 ? `; rolled back ${cleanup.cleanedCount} uploaded image(s)` : '';
    const warningSuffix = formatInventoryCleanupWarningSuffix(cleanup.cleanupWarnings);
    const message = extractInventoryMutationErrorMessage(error, 'Failed to upload product image');
    throw new Error(`${message}${cleanupSuffix}${warningSuffix}`);
  }
}
