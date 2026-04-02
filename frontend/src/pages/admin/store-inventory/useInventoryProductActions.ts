import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearInventoryFallbackCache } from '../../../hooks/useInventory';
import type { ProductRow } from '../../../hooks/useInventory';
import type { ExistingImage, ProductDraft } from '../../../components/admin/ProductFormModal';
import { toNumber } from './inventoryProducts';
import type { DeletingProduct } from './storeInventoryTypes';
import {
  deleteInventoryProductMutation,
  formatInventoryProductMutationError,
  loadInventoryProductImages,
  saveInventoryProductMutation,
} from './inventoryProductMutations';

const ADMIN_PRODUCT_DRAFT_KEY = 'admin-product-form:draft:v1';

type UseInventoryProductActionsParams = {
  products: ProductRow[];
  session: Session | null;
  refetch: () => Promise<unknown>;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
};

const mapProductRowToDraft = (row: ProductRow): ProductDraft => {
  const variants = (row.product_variants || []).filter((variant) => variant.is_active !== false);
  const mappedVariants = variants.map((variant) => {
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
    variants: mappedVariants.length ? mappedVariants : [{ name: 'Default', sku: '', price: '', stock: 0 }],
  };
};

export function useInventoryProductActions(params: UseInventoryProductActionsParams) {
  const { products, session, refetch, showToast } = params;
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ProductDraft | null>(null);
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
        setExistingImages([]);
        setShowProductForm(true);
      }
    } catch {
      return;
    }
  }, []);

  const handleOpenCreate = () => {
    setSaveError(null);
    setEditingDraft(null);
    setExistingImages([]);
    setExistingImagesLoading(false);
    setShowProductForm(true);
  };

  const handleOpenEdit = async (productId: number) => {
    const row = products.find((product) => product.id === productId);
    if (!row) {
      showToast('error', 'Product snapshot is unavailable. Please refresh and try again.');
      return;
    }

    setSaveError(null);
    setEditingDraft(mapProductRowToDraft(row));
    setExistingImages([]);
    setExistingImagesLoading(true);
    setShowProductForm(true);

    try {
      setExistingImages(await loadInventoryProductImages(productId));
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

    try {
      await deleteInventoryProductMutation({ deletingProduct, session });
      setDeletingProduct(null);
      clearInventoryFallbackCache();
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      setSaveError(message);
      showToast('error', message);
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

    try {
      await saveInventoryProductMutation({
        draft,
        newImages,
        removedImageUrls,
        existingImages,
        currentProducts: products,
        session,
      });
      setShowProductForm(false);
      setEditingDraft(null);
      setExistingImages([]);
      setExistingImagesLoading(false);
      if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      clearInventoryFallbackCache();
      await refetch();
    } catch (error) {
      const message = formatInventoryProductMutationError(error);
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
    setEditingDraft(null);
    setExistingImages([]);
    setExistingImagesLoading(false);
  };

  return {
    showProductForm,
    editingProduct: editingDraft,
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
