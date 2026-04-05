import type { Session } from '@supabase/supabase-js';

import type { ExistingImage, ProductDraft } from '../../../components/admin/ProductFormModal';
import type { ProductImageRecordInput } from '../../../lib/imagekit';
import { createSupabaseFunctionError } from '../../../lib/supabaseFunctionError';
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

type InventoryMutationAuth = {
  session: Session | null;
  getValidAccessToken?: () => Promise<string | null>;
  refreshSession?: () => Promise<void>;
};

type FunctionInvokeError = {
  status?: number;
};

type InventoryMutationErrorMetadata = Error & {
  status?: number;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

const SESSION_EXPIRED_MESSAGE = 'Sesi login kadaluarsa. Silakan login ulang.';

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

const withInventoryMutationErrorMetadata = (message: string, source: unknown): InventoryMutationErrorMetadata => {
  const nextError = new Error(message) as InventoryMutationErrorMetadata;
  if (source && typeof source === 'object') {
    const maybe = source as {
      status?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (typeof maybe.status === 'number') nextError.status = maybe.status;
    if (typeof maybe.code === 'string' && maybe.code.trim().length > 0) nextError.code = maybe.code;
    if (typeof maybe.details === 'string' && maybe.details.trim().length > 0) nextError.details = maybe.details;
    if (typeof maybe.hint === 'string' && maybe.hint.trim().length > 0) nextError.hint = maybe.hint;
  }
  return nextError;
};

async function invokeInventoryMutation<TResponse>(
  accessToken: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const { data, error, response } = await withTimeout(
    supabase.functions.invoke(INVENTORY_MUTATION_FUNCTION, {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );

  if (error) {
    const status = (error as FunctionInvokeError).status;
    if (status === 401) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    throw await createSupabaseFunctionError({
      error,
      response,
      fallbackMessage: 'Failed to mutate inventory product',
    });
  }

  return data as TResponse;
}

async function resolveInventoryAccessToken(auth: InventoryMutationAuth): Promise<string | null> {
  if (typeof auth.getValidAccessToken === 'function') {
    const validatedToken = await auth.getValidAccessToken();
    if (validatedToken) return validatedToken;
  }

  return ensureFreshToken(
    auth.session,
    typeof auth.refreshSession === 'function' ? { refreshSession: auth.refreshSession } : undefined
  );
}

async function invokeInventoryMutationWithRetry<TResponse>(
  auth: InventoryMutationAuth,
  body: Record<string, unknown>
): Promise<TResponse> {
  let accessToken = await resolveInventoryAccessToken(auth);
  if (!accessToken) throw new Error(SESSION_EXPIRED_MESSAGE);

  try {
    return await invokeInventoryMutation<TResponse>(accessToken, body);
  } catch (error) {
    const isUnauthorized = error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE;
    if (!isUnauthorized || typeof auth.refreshSession !== 'function') throw error;

    await auth.refreshSession();
    accessToken = await resolveInventoryAccessToken(auth);
    if (!accessToken) throw new Error(SESSION_EXPIRED_MESSAGE);
    return invokeInventoryMutation<TResponse>(accessToken, body);
  }
}

async function cleanupImageKitFiles(
  auth: InventoryMutationAuth,
  images: ProductImageRecordInput[]
): Promise<InventoryCleanupMutationResponse> {
  const fileIds = extractImageKitFileIds(images);
  if (fileIds.length === 0) {
    return { ok: true, cleanedCount: 0, cleanupWarnings: [] };
  }

  const response = await invokeInventoryMutationWithRetry<InventoryCleanupMutationResponse>(auth, {
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
  auth: InventoryMutationAuth;
  syncVariants: boolean;
}): Promise<InventorySaveMutationResponse> {
  const { draft, newImages, removedImageUrls, auth, syncVariants } = params;
  const normalizedDraft = normalizeInventoryProductDraft(draft);
  const response = await invokeInventoryMutationWithRetry<InventorySaveMutationResponse>(auth, {
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
  const maybeError =
    err && typeof err === 'object' ? (err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }) : null;
  const message =
    err instanceof Error && err.message
      ? err.message
      : typeof err === 'string' && err.trim()
        ? err
        : typeof maybeError?.message === 'string'
          ? maybeError.message
          : '';
  const normalizedMessage = message.toLowerCase();
  const code = typeof maybeError?.code === 'string' && maybeError.code.trim().length > 0 ? maybeError.code.trim() : null;

  if (code === '23505') {
    if (normalizedMessage.includes('sku')) {
      return 'Variant SKU sudah dipakai variant aktif lain. Gunakan SKU lain atau nonaktifkan produk lama terlebih dahulu.';
    }
    if (normalizedMessage.includes('slug')) {
      return 'Slug produk sudah dipakai. Gunakan slug lain.';
    }
    return 'Ada data duplikat. Periksa kembali SKU variant dan slug produk.';
  }

  if (normalizedMessage.includes('variant') && normalizedMessage.includes('not found for product')) {
    return 'Salah satu variant produk sudah berubah di server. Refresh halaman lalu coba simpan lagi.';
  }

  if (normalizedMessage.includes('product') && normalizedMessage.includes('not found')) {
    return 'Produk yang sedang diedit tidak ditemukan lagi. Refresh halaman lalu coba lagi.';
  }

  if (normalizedMessage.includes('max 8 images per product exceeded')) {
    return 'Maksimal 8 gambar per produk. Hapus beberapa gambar lalu coba simpan lagi.';
  }

  if (normalizedMessage.includes('null value in column') && normalizedMessage.includes('attributes')) {
    return 'Variant gagal disimpan karena atribut variant kosong tidak diterima server.';
  }

  if (message) return message;
  if (err && typeof err === 'object') {
    const fallback = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [fallback.message, fallback.details, fallback.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 2);
    if (parts.length > 0) return parts.join(' | ');
    if (typeof fallback.code === 'string' && fallback.code.trim().length > 0) return `Error code: ${fallback.code}`;
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
  auth: InventoryMutationAuth;
}): Promise<InventoryDeleteMutationResponse> {
  const { deletingProduct, auth } = params;
  const response = await invokeInventoryMutationWithRetry<InventoryDeleteMutationResponse>(auth, {
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
  auth: InventoryMutationAuth;
}): Promise<InventorySaveMutationResponse> {
  const { draft, newImages, removedImageUrls, auth } = params;
  const accessToken = await resolveInventoryAccessToken(auth);
  if (!accessToken) throw new Error(SESSION_EXPIRED_MESSAGE);

  const normalizedDraft = normalizeInventoryProductDraft(draft);
  if (normalizedDraft.id != null) {
    const uploadedImages = await uploadInventoryImagesWithRollback({
      files: newImages,
      productId: normalizedDraft.id,
      accessToken,
      cleanupImages: async (images) => {
        const result = await cleanupImageKitFiles(auth, images);
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
        auth,
        syncVariants: true,
      });
    } catch (error) {
      const cleanup = await cleanupImageKitFiles(auth, uploadedImages).catch((cleanupError) => ({
        ok: true as const,
        cleanedCount: 0,
        cleanupWarnings: [extractInventoryMutationErrorMessage(cleanupError, 'Failed to clean up uploaded images')],
      }));

      const cleanupSuffix = cleanup.cleanedCount > 0 ? `; rolled back ${cleanup.cleanedCount} uploaded image(s)` : '';
      const warningSuffix = formatInventoryCleanupWarningSuffix(cleanup.cleanupWarnings ?? []);
      const message = extractInventoryMutationErrorMessage(error, 'Failed to save product');
      throw withInventoryMutationErrorMetadata(`${message}${cleanupSuffix}${warningSuffix}`, error);
    }
  }

  const createResponse = await saveInventoryProductOnServer({
    draft: normalizedDraft,
    newImages: [],
    removedImageUrls: [],
    auth,
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
        const result = await cleanupImageKitFiles(auth, images);
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
      auth,
      syncVariants: false,
    });
    return {
      ...attachResponse,
      created: createResponse.created || attachResponse.created,
      cleanupWarnings: [...(createResponse.cleanupWarnings ?? []), ...(attachResponse.cleanupWarnings ?? [])],
    };
  } catch (error) {
    const cleanup = await cleanupImageKitFiles(auth, uploadedImages).catch((cleanupError) => ({
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
      throw withInventoryMutationErrorMetadata(
        `${message}${cleanupSuffix}${warningSuffix}; failed to rollback created product: ${rollbackError.message}`,
        error
      );
    }
    throw withInventoryMutationErrorMetadata(`${message}${cleanupSuffix}${warningSuffix}`, error);
  }
}
