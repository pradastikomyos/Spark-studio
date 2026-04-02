import type { Session } from '@supabase/supabase-js';

import type { ExistingImage, ProductDraft } from '../../../components/admin/ProductFormModal';
import {
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_UPLOAD_CONCURRENCY,
  PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
} from '../../../constants/productImages';
import type { ProductRow } from '../../../hooks/useInventory';
import { supabase } from '../../../lib/supabase';
import { ensureFreshToken } from '../../../utils/auth';
import { withTimeout } from '../../../utils/queryHelpers';
import { deleteProductImage, saveProductImages, uploadProductImages } from '../../../utils/uploadProductImage';
import type { DeletingProduct } from './storeInventoryTypes';

const REQUEST_TIMEOUT_MS = 60000;

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
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

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
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const maybe = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (maybe.code === '23505') {
      const message = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : '';
      if (message.includes('sku')) {
        return '⚠️ Variant SKU already exists on an active variant. Please use a different SKU or delete the old product first.';
      }
      if (message.includes('slug')) {
        return '⚠️ Product slug is already taken. Please use a different slug.';
      }
      return '⚠️ Duplicate data detected. Please check SKU/slug uniqueness.';
    }
    const parts = [maybe.message, maybe.details, maybe.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 2);
    if (parts.length) return parts.join(' • ');
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
}): Promise<void> {
  const { deletingProduct, session } = params;
  const token = await ensureFreshToken(session);
  if (!token) throw new Error('Session expired. Please refresh and log in again.');

  const { data: productImages, error: productImagesError } = await withTimeout(
    supabase
      .from('product_images')
      .select('id, image_url, image_provider, provider_file_id, provider_file_path')
      .eq('product_id', deletingProduct.id),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );
  if (productImagesError) throw productImagesError;

  for (const image of productImages || []) {
    await deleteProductImage(
      {
        id: Number((image as { id: number | string }).id),
        image_url: String((image as { image_url?: string }).image_url ?? ''),
        image_provider: (image as { image_provider?: 'supabase' | 'imagekit' | null }).image_provider ?? 'supabase',
        provider_file_id: (image as { provider_file_id?: string | null }).provider_file_id ?? null,
        provider_file_path: (image as { provider_file_path?: string | null }).provider_file_path ?? null,
      },
      deletingProduct.id,
      { accessToken: token }
    );
  }

  const deletedAt = new Date().toISOString();
  const { error: cascadeError } = await withTimeout(
    supabase.rpc('soft_delete_product_cascade', { p_product_id: deletingProduct.id, p_deleted_at: deletedAt }),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );
  if (cascadeError) throw cascadeError;
}

async function ensureUniqueProductIdentifiers(draft: ProductDraft) {
  const [slugDup, skuDup] = await Promise.all([
    withTimeout(
      supabase.from('products').select('id, slug').eq('slug', draft.slug).is('deleted_at', null).maybeSingle(),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    ),
    withTimeout(
      supabase.from('products').select('id, sku').eq('sku', draft.sku).is('deleted_at', null).maybeSingle(),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    ),
  ]);

  if (slugDup.error && slugDup.error.code !== 'PGRST116') throw slugDup.error;
  if (skuDup.error && skuDup.error.code !== 'PGRST116') throw skuDup.error;

  if (slugDup.data) {
    throw new Error(`⚠️ Product with slug "${draft.slug}" already exists. Please use a different product name or edit the slug manually.`);
  }
  if (skuDup.data) {
    throw new Error(`⚠️ Product with SKU "${draft.sku}" already exists. Please use a different SKU.`);
  }
}

async function upsertProductRecord(draft: ProductDraft): Promise<number> {
  let productId = draft.id ?? null;

  if (!productId) {
    await ensureUniqueProductIdentifiers(draft);

    const { data, error } = await withTimeout(
      supabase
        .from('products')
        .insert({
          name: draft.name,
          slug: draft.slug,
          description: draft.description || null,
          category_id: draft.category_id,
          sku: draft.sku,
          is_active: draft.is_active,
        })
        .select('id')
        .single(),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    );

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('slug')) {
          throw new Error(`⚠️ Product slug "${draft.slug}" is already taken. Please use a different name.`);
        }
        if (error.message.includes('sku')) {
          throw new Error(`⚠️ Product SKU "${draft.sku}" is already taken. Please use a different SKU.`);
        }
        throw new Error('⚠️ A product with this slug or SKU already exists.');
      }
      throw error;
    }
    if (!data) throw new Error('Failed to create product');
    productId = Number(data.id);
  } else {
    const { error } = await withTimeout(
      supabase
        .from('products')
        .update({
          name: draft.name,
          slug: draft.slug,
          description: draft.description || null,
          category_id: draft.category_id,
          sku: draft.sku,
          is_active: draft.is_active,
        })
        .eq('id', productId),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    );
    if (error) throw error;
  }

  return productId;
}

async function syncInventoryProductImages(params: {
  productId: number;
  removedImageUrls: string[];
  existingImages: ExistingImage[];
  newImages: File[];
  accessToken: string;
}) {
  const { productId, removedImageUrls, existingImages, newImages, accessToken } = params;

  if (removedImageUrls.length > 0) {
    const removedExistingImages = existingImages.filter((image) => removedImageUrls.includes(image.url));
    for (const image of removedExistingImages) {
      await deleteProductImage(
        {
          id: image.id,
          image_url: image.url,
          image_provider: image.image_provider ?? 'supabase',
          provider_file_id: image.provider_file_id ?? null,
          provider_file_path: image.provider_file_path ?? null,
        },
        productId,
        { accessToken }
      );
    }
  }

  if (newImages.length > 0) {
    const { data: existingImageRows } = await withTimeout(
      supabase.from('product_images').select('display_order').eq('product_id', productId).order('display_order', { ascending: false }).limit(1),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    );

    const startOrder = existingImageRows && existingImageRows.length > 0 ? existingImageRows[0].display_order + 1 : 0;
    const uploadedImages = await uploadProductImages(newImages, productId, {
      accessToken,
      maxSizeMb: MAX_PRODUCT_IMAGE_SIZE_MB,
      timeoutMs: PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
      concurrency: PRODUCT_IMAGE_UPLOAD_CONCURRENCY,
    });
    await saveProductImages(productId, uploadedImages, startOrder);
  }
}

async function syncInventoryProductVariants(params: {
  productId: number;
  draft: ProductDraft;
  currentProducts: ProductRow[];
}) {
  const { productId, draft, currentProducts } = params;
  const existingVariants = (currentProducts.find((product) => product.id === productId)?.product_variants || []).filter(
    (variant) => variant.is_active !== false
  );

  const incomingIds = new Set<number>(
    draft.variants.flatMap((variant) => {
      const id = toValidVariantId(variant.id);
      return id != null ? [id] : [];
    })
  );
  const existingIds = existingVariants
    .map((variant) => toValidVariantId((variant as { id?: unknown }).id))
    .filter((id): id is number => id != null);
  const removedIds = existingIds.filter((id) => !incomingIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await withTimeout(
      supabase.from('product_variants').update({ is_active: false }).in('id', removedIds),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    );
    if (error) throw error;
  }

  const updates = draft.variants.filter((variant) => toValidVariantId(variant.id) != null);
  for (const variant of updates) {
    const nextAttributes: Record<string, unknown> = {};
    if (variant.size) nextAttributes.size = variant.size;
    if (variant.color) nextAttributes.color = variant.color;

    const { error } = await withTimeout(
      supabase
        .from('product_variants')
        .update({
          name: variant.name,
          sku: variant.sku,
          price: variant.price ? Number(variant.price) : null,
          stock: variant.stock,
          is_active: true,
          attributes: Object.keys(nextAttributes).length ? nextAttributes : null,
        })
        .eq('id', toValidVariantId(variant.id) as number),
      REQUEST_TIMEOUT_MS,
      'Request timeout. Please try again.'
    );
    if (error) throw error;
  }

  const inserts = draft.variants.filter((variant) => toValidVariantId(variant.id) == null);
  if (inserts.length === 0) return;

  const rows = inserts.map((variant) => {
    const attributes: Record<string, unknown> = {};
    if (variant.size) attributes.size = variant.size;
    if (variant.color) attributes.color = variant.color;

    return {
      product_id: productId,
      name: variant.name,
      sku: variant.sku,
      price: variant.price ? Number(variant.price) : null,
      stock: variant.stock,
      reserved_stock: 0,
      is_active: true,
      attributes: Object.keys(attributes).length ? attributes : null,
    };
  });

  const { error } = await withTimeout(
    supabase.from('product_variants').insert(rows),
    REQUEST_TIMEOUT_MS,
    'Request timeout. Please try again.'
  );
  if (error) throw error;
}

export async function saveInventoryProductMutation(params: {
  draft: ProductDraft;
  newImages: File[];
  removedImageUrls: string[];
  existingImages: ExistingImage[];
  currentProducts: ProductRow[];
  session: Session | null;
}): Promise<void> {
  const { draft, newImages, removedImageUrls, existingImages, currentProducts, session } = params;
  const accessToken = await ensureFreshToken(session);
  if (!accessToken) throw new Error('Session expired. Please refresh and log in again.');

  const normalizedDraft = normalizeInventoryProductDraft(draft);
  const productId = await upsertProductRecord(normalizedDraft);

  await syncInventoryProductImages({
    productId,
    removedImageUrls,
    existingImages,
    newImages,
    accessToken,
  });

  await syncInventoryProductVariants({
    productId,
    draft: normalizedDraft,
    currentProducts,
  });
}
