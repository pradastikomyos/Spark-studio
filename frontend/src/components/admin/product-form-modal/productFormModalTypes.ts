import type { Dispatch, SetStateAction } from 'react';
import type { ImagePreview } from '../ProductImageUpload';

export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  parent_id?: number | null;
};

export type ProductVariantDraft = {
  id?: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
  size?: string;
  color?: string;
};

export type ProductDraft = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  category_id: number | null;
  sku: string;
  is_active: boolean;
  variants: ProductVariantDraft[];
};

export type ExistingImage = {
  url: string;
  is_primary: boolean;
};

export type ProductFormModalProps = {
  isOpen: boolean;
  categories: CategoryOption[];
  initialValue?: ProductDraft | null;
  existingImages?: ExistingImage[];
  existingImagesLoading?: boolean;
  onClose: () => void;
  onSave: (payload: {
    draft: ProductDraft;
    newImages: File[];
    removedImageUrls: string[];
  }) => Promise<void> | void;
};

export type ProductFormModalController = {
  draft: ProductDraft;
  images: ImagePreview[];
  removedImageUrls: string[];
  slugTouched: boolean;
  saving: boolean;
  error: string | null;
  isOnline: boolean;
  categoryOptions: CategoryOption[];
  activeExistingImages: ExistingImage[];
  setDraft: Dispatch<SetStateAction<ProductDraft>>;
  setImages: Dispatch<SetStateAction<ImagePreview[]>>;
  setSlugTouched: Dispatch<SetStateAction<boolean>>;
  handleSave: () => Promise<void>;
  handleRequestClose: () => void;
  handleRemoveExisting: (url: string) => void;
};
