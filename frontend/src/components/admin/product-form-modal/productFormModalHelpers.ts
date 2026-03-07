import { MAX_PRODUCT_IMAGES, PRODUCT_IMAGE_UPLOAD_CONCURRENCY, PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS } from '../../../constants/productImages';
import type { CategoryOption, ExistingImage, ProductDraft, ProductVariantDraft } from './productFormModalTypes';

export const ADMIN_PRODUCT_DRAFT_KEY = 'admin-product-form:draft:v1';
export const ADMIN_PRODUCT_IMAGE_KEY = 'admin-product-form:images:v1';
export const EMPTY_DRAFT_SNAPSHOT = JSON.stringify(emptyDraft());

export function formatCurrency(value: string | number): string {
  const numValue = typeof value === 'string' ? value.replace(/\D/g, '') : String(value);
  if (!numValue) return '';
  return Number(numValue).toLocaleString('id-ID');
}

export function parseCurrency(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function createEmptyVariant(): ProductVariantDraft {
  return { name: '', sku: '', price: '', stock: 0 };
}

export function emptyDraft(): ProductDraft {
  return {
    name: '',
    slug: '',
    description: '',
    category_id: null,
    sku: '',
    is_active: true,
    variants: [{ name: 'Default', sku: '', price: '', stock: 0 }],
  };
}

export function buildDraftSnapshot(initialValue?: ProductDraft | null): string {
  return JSON.stringify(initialValue ? { ...initialValue } : emptyDraft());
}

export function getCategoryOptions(categories: CategoryOption[]): CategoryOption[] {
  const active = categories.filter((category) => category.is_active !== false);
  const nameMap = new Map(active.map((category) => [category.id, category.name]));

  return active
    .slice()
    .sort((left, right) => {
      const leftParent = left.parent_id ? nameMap.get(left.parent_id) ?? '' : left.name;
      const rightParent = right.parent_id ? nameMap.get(right.parent_id) ?? '' : right.name;
      const parentSort = leftParent.localeCompare(rightParent);
      if (parentSort !== 0) return parentSort;
      if (left.parent_id && !right.parent_id) return 1;
      if (!left.parent_id && right.parent_id) return -1;
      return left.name.localeCompare(right.name);
    });
}

export function getCategoryNameMap(categories: CategoryOption[]): Map<number, string> {
  return new Map(categories.map((category) => [category.id, category.name]));
}

export function getIsDirty(params: {
  draft: ProductDraft;
  imagesLength: number;
  removedImageUrlsLength: number;
  initialValue?: ProductDraft | null;
  initialDraftSnapshot: string;
}): boolean {
  const { draft, imagesLength, removedImageUrlsLength, initialValue, initialDraftSnapshot } = params;
  const currentSnapshot = JSON.stringify(draft);

  if (initialValue?.id) {
    return currentSnapshot !== initialDraftSnapshot || imagesLength > 0 || removedImageUrlsLength > 0;
  }

  return currentSnapshot !== EMPTY_DRAFT_SNAPSHOT || imagesLength > 0 || removedImageUrlsLength > 0;
}

export function validateProductDraft(params: {
  draft: ProductDraft;
  imagesLength: number;
  existingImages: ExistingImage[];
  removedImageUrlsLength: number;
}): string | null {
  const { draft, imagesLength, existingImages, removedImageUrlsLength } = params;

  if (!draft.name.trim()) return 'Name is required.';
  if (!draft.slug.trim()) return 'Slug is required.';
  if (!draft.sku.trim()) return 'Product SKU is required.';
  if (!draft.category_id) return 'Category is required.';
  if (!draft.variants.length) return 'At least one variant is required.';

  const totalImages = imagesLength + existingImages.length - removedImageUrlsLength;
  if (totalImages === 0) return 'At least one product image is required.';
  if (totalImages > MAX_PRODUCT_IMAGES) return `Max ${MAX_PRODUCT_IMAGES} product images allowed.`;

  for (const variant of draft.variants) {
    if (!variant.name.trim()) return 'Variant name is required.';
    if (!variant.sku.trim()) return 'Variant SKU is required.';
    if (!variant.price || variant.price.trim() === '' || Number(variant.price) <= 0) {
      return `Variant "${variant.name || 'unnamed'}" must have a valid price greater than 0.`;
    }
  }

  return null;
}

export function getSaveTimeoutMs(newImageFilesLength: number): number {
  const batches = Math.max(1, Math.ceil(newImageFilesLength / PRODUCT_IMAGE_UPLOAD_CONCURRENCY));
  return 90_000 + batches * (PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS + 30_000);
}
