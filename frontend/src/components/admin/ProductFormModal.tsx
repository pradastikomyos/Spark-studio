import ProductImageUpload from './ProductImageUpload';
import { MAX_PRODUCT_IMAGES } from '../../constants/productImages';
import { ProductDetailsSection } from './product-form-modal/ProductDetailsSection';
import { ProductVariantsSection } from './product-form-modal/ProductVariantsSection';
import { useProductFormModalController } from './product-form-modal/useProductFormModalController';
import type { ProductFormModalProps } from './product-form-modal/productFormModalTypes';

export type {
  CategoryOption,
  ExistingImage,
  ProductDraft,
  ProductVariantDraft,
} from './product-form-modal/productFormModalTypes';

export default function ProductFormModal(props: ProductFormModalProps) {
  const { isOpen, existingImagesLoading = false } = props;
  const controller = useProductFormModalController(props);
  const {
    draft,
    saving,
    error,
    isOnline,
    categoryOptions,
    activeExistingImages,
    setDraft,
    setImages,
    setSlugTouched,
    handleSave,
    handleRequestClose,
    handleRemoveExisting,
  } = controller;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={handleRequestClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl animate-fade-in-scale">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">{draft.id ? 'Edit Product' : 'Add Product'}</h3>
            <p className="mt-1 text-sm text-gray-600">Create or update product details, variants, and images.</p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={saving}
            className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {!isOnline ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-100/60 p-3 text-xs text-amber-900">
                Koneksi internet terputus. Perubahan tidak bisa disimpan sampai online kembali.
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
            ) : null}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              {existingImagesLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white/70 py-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                  <p className="text-xs font-medium text-gray-500">Loading images...</p>
                </div>
              ) : (
                <ProductImageUpload
                  images={controller.images}
                  existingImages={activeExistingImages}
                  maxImages={MAX_PRODUCT_IMAGES}
                  onChange={setImages}
                  onRemoveExisting={handleRemoveExisting}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ProductDetailsSection
                draft={draft}
                slugTouched={controller.slugTouched}
                categoryOptions={categoryOptions}
                setDraft={setDraft}
                setSlugTouched={setSlugTouched}
              />
              <ProductVariantsSection draft={draft} saving={saving} setDraft={setDraft} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-6 py-5">
          <p className="text-xs text-gray-600">Saving will apply changes to products, variants, and images.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={saving}
              className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-[#ff4b86] px-5 py-2 text-sm font-bold text-white hover:bg-[#e63d75] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
