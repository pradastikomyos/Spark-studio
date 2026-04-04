import type { Session } from '@supabase/supabase-js';

import type { ExistingImage, ProductDraft } from '../../../components/admin/ProductFormModal';
import type { ProductImageRecordInput } from '../../../lib/imagekit';
import { supabase } from '../../../lib/supabase';
import { ensureFreshToken } from '../../../utils/auth';
import { withTimeout } from '../../../utils/queryHelpers';
import {
  extractImageKitFileIds,
  extractInventoryMutationErrorMessage,
  formatInventoryCleanupWarningSuffix,
  uploadInventoryImagesWithRollback,
} from './inventoryProductImageLifecycle';
import type { DeletingProduct } from './storeInventoryTypes';

const REQUEST_TIMEOUT_MS = 60000;
const INVENTORY_MUTATION_FUNCTION = 'inventory-product-mutation';

type InventoryMutationResponse = {
  cleanupWarnings?: string[];
};

type InventorySaveMutationResponse = InventoryMutationResponse & {
  ok: true;
  productId: number;
  created: boolean;
  newImageCount: number;
  removedImageCount: number;
  variantCount: number;
  imageCount: number;
};

type InventoryDeleteMutationResponse = InventoryMutationResponse & {
  ok: true;
  productId: number;
  deletedImageCount: number;
};

type InventoryCleanupMutationResponse = InventoryMutationResponse & {
  ok: true;
  cleanedCount: number;
};

const normalizeSku = (value: string) =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .trim()
    .toUpperCase();

const normalizeSlug = (value: string) =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\uFEFF]/g, '')
    .trim()
    .toLowerCase();

const toValidVariantId = (value: unknown): number | null => {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

async function invokeInventoryMutation<TResponse>(
  accessToken: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke(INVENTORY_MUTATION_FUNCTION, {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );

  if (error) {
    throw new Error(error.message || 'Failed to mutate inventory product');
  }

  return data as TResponse;
}

async function cleanupImageKitFiles(
  accessToken: string,
  images: ProductImageRecordInput[]
): Promise<InventoryCleanupMutationResponse> {
  const fileIds = extractImageKitFileIds(images);
  if (fileIds.length === 0) {
    return { ok: true, cleanedCount: 0, cleanupWarnings: [] };
  }

  const response = await invokeInventoryMutation<InventoryCleanupMutationResponse>(accessToken, {
    action: 'cleanup',
    fileIds,
  });

  return {
    ok: true,
    cleanedCount: response.cleanedCount ?? 0,
    cleanupWarnings: response.cleanupWarnings ?? [],
  };
}

async function saveInventoryProductOnServer(params: {
  draft: ProductDraft;
  newImages: ProductImageRecordInput[];
  removedImageUrls: string[];
  session: Session | null;
  syncVariants: boolean;
}): Promise<InventorySaveMutationResponse> {
  const { draft, newImages, removedImageUrls, session, syncVariants } = params;
  const accessToken = await ensureFreshToken(session);
  if (!accessToken) throw new Error('Session expired. Please refresh and log in again.');

  const normalizedDraft = normalizeInventoryProductDraft(draft);
  const response = await invokeInventoryMutation<InventorySaveMutationResponse>(accessToken, {
    action: 'save',
    productId: normalizedDraft.id ?? null,
    name: normalizedDraft.name,
    slug: normalizedDraft.slug,
    description: normalizedDraft.description || null,
    categoryId: normalizedDraft.category_id,
    sku: normalizedDraft.sku,
    isActive: normalizedDraft.is_active,
    syncVariants,
    variants: normalizedDraft.variants.map((variant) => ({
      id: toValidVariantId(variant.id),
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      size: variant.size || null,
      color: variant.color || null,
    })),
    newImages,
    removedImageUrls,
  });

  return {
    ok: true,
    productId: response.productId,
    created: response.created,
    newImageCount: response.newImageCount,
    removedImageCount: response.removedImageCount,
    variantCount: response.variantCount,
    imageCount: response.imageCount,
    cleanupWarnings: response.cleanupWarnings ?? [],
  };
}

export const normalizeInventoryProductDraft = (draft: ProductDraft): ProductDraft => ({
  ...draft,
  name: draft.name.trim(),
  slug: normalizeSlug(draft.slug),
  sku: normalizeSku(draft.sku),
  variants: draft.variants.map((variant) => ({
    ...variant,
    name: variant.name.trim(),
    sku: normalizeSku(variant.sku),
    price: typeof variant.price === 'string' ? variant.price.trim() : String(variant.price ?? '').trim(),
  })),
});

export const formatInventoryProductMutationError = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const maybe = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (maybe.code === '23505') {
      const message = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : '';
      if (message.includes('sku')) {
        return 'Variant SKU already exists on an active variant. Please use a different SKU or delete the old product first.';
      }
      if (message.includes('slug')) {
        return 'Product slug is already taken. Please use a different slug.';
      }
      return 'Duplicate data detected. Please check SKU and slug uniqueness.';
    }
    const parts = [maybe.message, maybe.details, maybe.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 2);
    if (parts.length > 0) return parts.join(' • ');
    if (typeof maybe.code === 'string' && maybe.code.trim().length > 0) return `Error code: ${maybe.code}`;
  }
  return 'Failed to save product';
};

export async function loadInventoryProductImages(productId: number): Promise<ExistingImage[]> {
  const { data } = await withTimeout(
    supabase
      .from('product_images')
      .select('id, image_url, is_primary, image_provider, provider_file_id, provider_file_path')
      .eq('product_id', productId)
      .order('display_order'),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );

  return (
    data?.map((img: {
      id: number;
      image_url: string;
      is_primary: boolean;
      image_provider?: 'supabase' | 'imagekit' | null;
      provider_file_id?: string | null;
      provider_file_path?: string | null;
    }) => ({
      id: img.id,
      url: img.image_url,
      is_primary: img.is_primary,
      image_provider: img.image_provider ?? 'supabase',
      provider_file_id: img.provider_file_id ?? null,
      provider_file_path: img.provider_file_path ?? null,
    })) ?? []
  );
}

export async function deleteInventoryProductMutation(params: {
  deletingProduct: DeletingProduct;
  session: Session | null;
}): Promise<InventoryDeleteMutationResponse> {
  const { deletingProduct, session } = params;
  const accessToken = await ensureFreshToken(session);
  if (!accessToken) throw new Error('Session expired. Please refresh and log in again.');

  const response = await invokeInventoryMutation<InventoryDeleteMutationResponse>(accessToken, {
    action: 'delete',
    productId: deletingProduct.id,
  });

  return {
    ok: true,
    productId: response.productId,
    deletedImageCount: response.deletedImageCount,
    cleanupWarnings: response.cleanupWarnings ?? [],
  };
}

export async function saveInventoryProductMutation(params: {
  draft: ProductDraft;
  newImages: File[];
  removedImageUrls: string[];
  session: Session | null;
}): Promise<InventorySaveMutationResponse> {
  const { draft, newImages, removedImageUrls, session } = params;
  const accessToken = await ensureFreshToken(session);
  if (!accessToken) throw new Error('Session expired. Please refresh and log in again.');

  const normalizedDraft = normalizeInventoryProductDraft(draft);
  if (normalizedDraft.id != null) {
    const uploadedImages = await uploadInventoryImagesWithRollback({
      files: newImages,
      productId: normalizedDraft.id,
      accessToken,
      cleanupImages: async (images) => {
        const result = await cleanupImageKitFiles(accessToken, images);
        return {
          cleanedCount: result.cleanedCount,
          cleanupWarnings: result.cleanupWarnings ?? [],
        };
      },
    });

    try {
      return await saveInventoryProductOnServer({
        draft: normalizedDraft,
        newImages: uploadedImages,
        removedImageUrls,
        session,
        syncVariants: true,
      });
    } catch (error) {
      const cleanup = await cleanupImageKitFiles(accessToken, uploadedImages).catch((cleanupError) => ({
        ok: true as const,
        cleanedCount: 0,
        cleanupWarnings: [extractInventoryMutationErrorMessage(cleanupError, 'Failed to clean up uploaded images')],
      }));

      const cleanupSuffix = cleanup.cleanedCount > 0 ? `; rolled back ${cleanup.cleanedCount} uploaded image(s)` : '';
      const warningSuffix = formatInventoryCleanupWarningSuffix(cleanup.cleanupWarnings ?? []);
      const message = extractInventoryMutationErrorMessage(error, 'Failed to save product');
      throw new Error(`${message}${cleanupSuffix}${warningSuffix}`);
    }
  }

  const createResponse = await saveInventoryProductOnServer({
    draft: normalizedDraft,
    newImages: [],
    removedImageUrls: [],
    session,
    syncVariants: true,
  });

  if (newImages.length === 0) {
    return createResponse;
  }

  let uploadedImages: ProductImageRecordInput[] = [];
  try {
    uploadedImages = await uploadInventoryImagesWithRollback({
      files: newImages,
      productId: createResponse.productId,
      accessToken,
      cleanupImages: async (images) => {
        const result = await cleanupImageKitFiles(accessToken, images);
        return {
          cleanedCount: result.cleanedCount,
          cleanupWarnings: result.cleanupWarnings ?? [],
        };
      },
    });
  } catch (error) {
    const rollbackError = await invokeInventoryMutation<InventoryDeleteMutationResponse>(accessToken, {
      action: 'delete',
      productId: createResponse.productId,
    }).catch((rollbackFailure) => rollbackFailure);
    if (rollbackError instanceof Error) {
      throw new Error(
        `${extractInventoryMutationErrorMessage(error, 'Failed to upload product image')}; failed to rollback created product: ${rollbackError.message}`
      );
    }
    throw error;
  }

  try {
    const attachResponse = await saveInventoryProductOnServer({
      draft: { ...normalizedDraft, id: createResponse.productId },
      newImages: uploadedImages,
      removedImageUrls: [],
      session,
      syncVariants: false,
    });
    return {
      ...attachResponse,
      created: createResponse.created || attachResponse.created,
      cleanupWarnings: [...(createResponse.cleanupWarnings ?? []), ...(attachResponse.cleanupWarnings ?? [])],
    };
  } catch (error) {
    const cleanup = await cleanupImageKitFiles(accessToken, uploadedImages).catch((cleanupError) => ({
      ok: true as const,
      cleanedCount: 0,
      cleanupWarnings: [extractInventoryMutationErrorMessage(cleanupError, 'Failed to clean up uploaded images')],
    }));

    const rollbackError = await invokeInventoryMutation<InventoryDeleteMutationResponse>(accessToken, {
      action: 'delete',
      productId: createResponse.productId,
    }).catch((rollbackFailure) => rollbackFailure);

    const cleanupSuffix = cleanup.cleanedCount > 0 ? `; rolled back ${cleanup.cleanedCount} uploaded image(s)` : '';
    const warningSuffix = formatInventoryCleanupWarningSuffix(cleanup.cleanupWarnings ?? []);
    const message = extractInventoryMutationErrorMessage(error, 'Failed to save product');
    if (rollbackError instanceof Error) {
      throw new Error(`${message}${cleanupSuffix}${warningSuffix}; failed to rollback created product: ${rollbackError.message}`);
    }
    throw new Error(`${message}${cleanupSuffix}${warningSuffix}`);
  }
}
