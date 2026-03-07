import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import {
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_UPLOAD_CONCURRENCY,
  PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
} from '../../../constants/productImages';
import { ensureFreshToken } from '../../../utils/auth';
import { withTimeout } from '../../../utils/queryHelpers';
import type { ProductRow } from '../../../hooks/useInventory';
import type { ExistingImage, ProductDraft } from '../../../components/admin/ProductFormModal';
import { toNumber } from './inventoryProducts';
import type { DeletingProduct } from './storeInventoryTypes';

const ADMIN_PRODUCT_DRAFT_KEY = 'admin-product-form:draft:v1';
const REQUEST_TIMEOUT_MS = 60000;

type UseInventoryProductActionsParams = {
  productsRaw: ProductRow[];
  setProductsRaw: React.Dispatch<React.SetStateAction<ProductRow[]>>;
  session: Session | null;
  refetch: () => Promise<unknown>;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
};

export function useInventoryProductActions(params: UseInventoryProductActionsParams) {
  const { productsRaw, setProductsRaw, session, refetch, showToast } = params;
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [existingImagesLoading, setExistingImagesLoading] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<DeletingProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(ADMIN_PRODUCT_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { mode?: string; savedAt?: number };
      const ageMs = typeof parsed.savedAt === 'number' ? Date.now() - parsed.savedAt : Number.POSITIVE_INFINITY;
      if (parsed.mode === 'create' && ageMs < 12 * 60 * 60 * 1000) {
        setEditingProductId(null);
        setExistingImages([]);
        setShowProductForm(true);
      }
    } catch {
      return;
    }
  }, []);

  const editingProduct = useMemo(() => {
    if (!editingProductId) return null;
    const row = productsRaw.find((product) => product.id === editingProductId);
    if (!row) return null;

    const variants = (row.product_variants || []).filter((variant) => variant.is_active !== false);
    const mapped = variants.map((variant) => {
      const attrs = variant.attributes || {};
      return {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: String(variant.price ?? ''),
        stock: toNumber(variant.stock, 0),
        size: typeof attrs.size === 'string' ? attrs.size : '',
        color: typeof attrs.color === 'string' ? attrs.color : '',
      };
    });

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      category_id: row.category_id ?? null,
      sku: row.sku,
      is_active: row.is_active,
      variants: mapped.length ? mapped : [{ name: 'Default', sku: '', price: '', stock: 0 }],
    } satisfies ProductDraft;
  }, [editingProductId, productsRaw]);

  const handleOpenCreate = () => {
    setSaveError(null);
    setEditingProductId(null);
    setExistingImages([]);
    setExistingImagesLoading(false);
    setShowProductForm(true);
  };

  const handleOpenEdit = async (productId: number) => {
    setSaveError(null);
    setEditingProductId(productId);
    setExistingImages([]);
    setExistingImagesLoading(true);
    setShowProductForm(true);

    try {
      const { data } = await withTimeout(
        supabase.from('product_images').select('image_url, is_primary').eq('product_id', productId).order('display_order'),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      setExistingImages(data?.map((img: { image_url: string; is_primary: boolean }) => ({ url: img.image_url, is_primary: img.is_primary })) || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load product images';
      showToast('error', message);
    } finally {
      setExistingImagesLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSaving(true);
    setSaveError(null);
    const previousProducts = productsRaw;
    const optimisticProducts = productsRaw.filter((product) => product.id !== deletingProduct.id);
    setProductsRaw(optimisticProducts);

    try {
      const token = await ensureFreshToken(session);
      if (!token) throw new Error('Session expired. Please refresh and log in again.');
      const deletedAt = new Date().toISOString();
      const { error } = await withTimeout(
        supabase.from('products').update({ deleted_at: deletedAt }).eq('id', deletingProduct.id),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );
      if (error) throw error;

      const { error: cascadeError } = await withTimeout(
        supabase.rpc('soft_delete_product_cascade', { p_product_id: deletingProduct.id, p_deleted_at: deletedAt }),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );
      if (cascadeError) throw cascadeError;

      setDeletingProduct(null);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      setSaveError(message);
      showToast('error', message);
      setProductsRaw(previousProducts);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (payload: {
    draft: ProductDraft;
    newImages: File[];
    removedImageUrls: string[];
  }) => {
    const { draft, newImages, removedImageUrls } = payload;
    setSaving(true);
    setSaveError(null);
    let rollbackProducts: ProductRow[] | null = null;

    try {
      const token = await ensureFreshToken(session);
      if (!token) throw new Error('Session expired. Please refresh and log in again.');

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

      const normalizedDraft: ProductDraft = {
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
      };

      let productId = draft.id ?? null;
      if (productId != null) {
        const stableProductId = productId;
        const optimisticProducts = productsRaw.map((product) =>
          product.id === stableProductId
            ? {
                ...product,
                name: normalizedDraft.name,
                slug: normalizedDraft.slug,
                description: normalizedDraft.description || null,
                category_id: normalizedDraft.category_id,
                sku: normalizedDraft.sku,
                is_active: normalizedDraft.is_active,
                product_variants: normalizedDraft.variants.map((variant) => ({
                  id: variant.id ?? 0,
                  product_id: stableProductId,
                  name: variant.name,
                  sku: variant.sku,
                  price: variant.price ? Number(variant.price) : null,
                  stock: variant.stock,
                  reserved_stock: 0,
                  attributes: null,
                  is_active: true,
                })),
              }
            : product
        );
        rollbackProducts = productsRaw;
        setProductsRaw(optimisticProducts);
      }

      if (!productId) {
        const [slugDup, skuDup] = await Promise.all([
          withTimeout(
            supabase.from('products').select('id, slug').eq('slug', normalizedDraft.slug).is('deleted_at', null).maybeSingle(),
            REQUEST_TIMEOUT_MS,
            'Request timeout. Please try again.'
          ),
          withTimeout(
            supabase.from('products').select('id, sku').eq('sku', normalizedDraft.sku).is('deleted_at', null).maybeSingle(),
            REQUEST_TIMEOUT_MS,
            'Request timeout. Please try again.'
          ),
        ]);

        if (slugDup.error && slugDup.error.code !== 'PGRST116') throw slugDup.error;
        if (skuDup.error && skuDup.error.code !== 'PGRST116') throw skuDup.error;

        if (slugDup.data) {
          throw new Error(`⚠️ Product with slug "${normalizedDraft.slug}" already exists. Please use a different product name or edit the slug manually.`);
        }
        if (skuDup.data) {
          throw new Error(`⚠️ Product with SKU "${normalizedDraft.sku}" already exists. Please use a different SKU.`);
        }

        const { data, error } = await withTimeout(
          supabase
            .from('products')
            .insert({
              name: normalizedDraft.name,
              slug: normalizedDraft.slug,
              description: normalizedDraft.description || null,
              category_id: normalizedDraft.category_id,
              sku: normalizedDraft.sku,
              is_active: normalizedDraft.is_active,
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
              name: normalizedDraft.name,
              slug: normalizedDraft.slug,
              description: normalizedDraft.description || null,
              category_id: normalizedDraft.category_id,
              sku: normalizedDraft.sku,
              is_active: normalizedDraft.is_active,
            })
            .eq('id', productId),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (error) throw error;
      }

      if (removedImageUrls.length > 0) {
        const { error } = await withTimeout(
          supabase.from('product_images').delete().eq('product_id', productId).in('image_url', removedImageUrls),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (error) throw error;
      }

      if (newImages.length > 0) {
        const { uploadProductImages, saveProductImages } = await import('../../../utils/uploadProductImage');
        const { data: existingImageRows } = await withTimeout(
          supabase.from('product_images').select('display_order').eq('product_id', productId).order('display_order', { ascending: false }).limit(1),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );

        const startOrder = existingImageRows && existingImageRows.length > 0 ? existingImageRows[0].display_order + 1 : 0;
        const uploadedUrls = await uploadProductImages(newImages, productId, {
          maxSizeMb: MAX_PRODUCT_IMAGE_SIZE_MB,
          timeoutMs: PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
          concurrency: PRODUCT_IMAGE_UPLOAD_CONCURRENCY,
        });
        await saveProductImages(productId, uploadedUrls, startOrder);
      }

      const existingVariants = (productsRaw.find((product) => product.id === productId)?.product_variants || []).filter((variant) => variant.is_active !== false);
      const toValidId = (value: unknown): number | null => {
        const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
      };
      const incomingIds = new Set<number>(
        normalizedDraft.variants.flatMap((variant) => {
          const id = toValidId(variant.id);
          return id != null ? [id] : [];
        })
      );
      const existingIds = existingVariants
        .map((variant) => toValidId((variant as unknown as { id?: unknown }).id))
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

      const updates = normalizedDraft.variants.filter((variant) => toValidId(variant.id) != null);
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
            .eq('id', toValidId(variant.id) as number),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (error) throw error;
      }

      const inserts = normalizedDraft.variants.filter((variant) => toValidId(variant.id) == null);
      if (inserts.length > 0) {
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

      setShowProductForm(false);
      setEditingProductId(null);
      if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      await refetch();
    } catch (error) {
      if (rollbackProducts) {
        setProductsRaw(rollbackProducts);
      }

      const formatError = (err: unknown): string => {
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
          const parts = [maybe.message, maybe.details, maybe.hint].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 2);
          if (parts.length) return parts.join(' • ');
          if (typeof maybe.code === 'string' && maybe.code.trim().length > 0) return `Error code: ${maybe.code}`;
        }
        return 'Failed to save product';
      };

      const message = formatError(error);
      if (
        message.toLowerCase().includes('failed to parse') ||
        message.toLowerCase().includes('invalid input syntax') ||
        message.toLowerCase().includes('schema cache')
      ) {
        showToast('error', `${message}. Jika baru deploy/update, coba hard refresh (Cmd+Shift+R) lalu ulangi.`);
      } else {
        showToast('error', message);
      }
      setSaveError(message);
      console.error('Save product failed', { error });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const closeProductForm = () => {
    if (saving) return;
    setShowProductForm(false);
    setEditingProductId(null);
    setExistingImages([]);
    setExistingImagesLoading(false);
  };

  return {
    showProductForm,
    editingProduct,
    existingImages,
    existingImagesLoading,
    deletingProduct,
    saving,
    saveError,
    setDeletingProduct,
    handleOpenCreate,
    handleOpenEdit,
    handleDelete,
    handleSaveProduct,
    closeProductForm,
  };
}
