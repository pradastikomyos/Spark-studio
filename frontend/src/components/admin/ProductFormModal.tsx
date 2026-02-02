import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { slugify } from '../../utils/merchant';
import ProductImageUpload, { ImagePreview } from './ProductImageUpload';

// Currency formatting utilities
const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? value.replace(/\D/g, '') : String(value);
  if (!numValue) return '';
  return Number(numValue).toLocaleString('id-ID');
};

const parseCurrency = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
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

type ProductFormModalProps = {
  isOpen: boolean;
  categories: CategoryOption[];
  initialValue?: ProductDraft | null;
  existingImages?: ExistingImage[];
  onClose: () => void;
  onSave: (payload: {
    draft: ProductDraft;
    newImages: File[];
    removedImageUrls: string[];
  }) => Promise<void> | void;
};

const emptyDraft = (): ProductDraft => ({
  name: '',
  slug: '',
  description: '',
  category_id: null,
  sku: '',
  is_active: true,
  variants: [{ name: 'Default', sku: '', price: '', stock: 0 }],
});

const ADMIN_PRODUCT_DRAFT_KEY = 'admin-product-form:draft:v1';
const ADMIN_PRODUCT_IMAGE_KEY = 'admin-product-form:images:v1';
const IMAGE_DB_NAME = 'admin-product-form';
const IMAGE_DB_STORE = 'imageDrafts';
const EMPTY_DRAFT_SNAPSHOT = JSON.stringify(emptyDraft());

type StoredImage = {
  name: string;
  type: string;
  order: number;
  buffer: ArrayBuffer;
};

const openImageDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_DB_STORE)) {
        db.createObjectStore(IMAGE_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readStoredImages = async (key: string): Promise<StoredImage[] | null> => {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readonly');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as StoredImage[] | undefined) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
};

const writeStoredImages = async (key: string, images: StoredImage[]): Promise<void> => {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.put(images, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
};

const clearStoredImages = async (key: string): Promise<void> => {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_DB_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_DB_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
};

export default function ProductFormModal(props: ProductFormModalProps) {
  const { isOpen, categories, initialValue, existingImages = [], onClose, onSave } = props;
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const initialDraftSnapshotRef = useRef<string>(EMPTY_DRAFT_SNAPSHOT);
  const restoringImagesRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const next = initialValue ? { ...initialValue } : emptyDraft();
    setDraft(next);
    setImages([]);
    setRemovedImageUrls([]);
    setSlugTouched(Boolean(initialValue?.slug));
    setError(null);
    setSaving(false);
    initialDraftSnapshotRef.current = JSON.stringify(next);
    restoringImagesRef.current = false;
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValue?.id) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(ADMIN_PRODUCT_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { mode?: string; draft?: ProductDraft; removedImageUrls?: string[] };
      if (parsed.mode !== 'create' || !parsed.draft) return;
      setDraft(parsed.draft);
      setRemovedImageUrls(Array.isArray(parsed.removedImageUrls) ? parsed.removedImageUrls : []);
      setSlugTouched(Boolean(parsed.draft.slug));
      setError('Draft dipulihkan setelah refresh.');
    } catch {
      return;
    }
  }, [isOpen, initialValue?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValue?.id) return;
    if (typeof window === 'undefined') return;
    let active = true;
    const run = async () => {
      try {
        const stored = await readStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
        if (!active || !stored || stored.length === 0) return;
        restoringImagesRef.current = true;
        const restored = stored
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => {
            const file = new File([item.buffer], item.name, { type: item.type });
            return { file, preview: URL.createObjectURL(file), order: idx };
          });
        setImages(restored);
        setError('Draft dipulihkan termasuk gambar.');
      } catch {
        return;
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [isOpen, initialValue?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValue?.id) return;
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        ADMIN_PRODUCT_DRAFT_KEY,
        JSON.stringify({
          mode: 'create',
          savedAt: Date.now(),
          draft,
          removedImageUrls,
        })
      );
    } catch {
      return;
    }
  }, [draft, removedImageUrls, initialValue?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValue?.id) return;
    if (typeof window === 'undefined') return;
    let active = true;
    const persist = async () => {
      try {
        if (images.length === 0) {
          await clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
          return;
        }
        const storedImages = await Promise.all(
          images.map(async (img) => ({
            name: img.file.name,
            type: img.file.type,
            order: img.order,
            buffer: await img.file.arrayBuffer(),
          }))
        );
        if (!active) return;
        await writeStoredImages(ADMIN_PRODUCT_IMAGE_KEY, storedImages);
      } catch {
        return;
      } finally {
        if (restoringImagesRef.current) restoringImagesRef.current = false;
      }
    };
    persist();
    return () => {
      active = false;
    };
  }, [images, initialValue?.id, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(window.navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => c.is_active !== false)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const isDirty = useMemo(() => {
    const currentSnapshot = JSON.stringify(draft);
    if (initialValue?.id) {
      return (
        currentSnapshot !== initialDraftSnapshotRef.current ||
        images.length > 0 ||
        removedImageUrls.length > 0
      );
    }
    return currentSnapshot !== EMPTY_DRAFT_SNAPSHOT || images.length > 0 || removedImageUrls.length > 0;
  }, [draft, images.length, removedImageUrls.length, initialValue?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saving || !isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, isDirty, saving]);

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Name is required.';
    if (!draft.slug.trim()) return 'Slug is required.';
    if (!draft.sku.trim()) return 'Product SKU is required.';
    if (!draft.category_id) return 'Category is required.';
    if (!draft.variants.length) return 'At least one variant is required.';

    const totalImages = images.length + existingImages.length - removedImageUrls.length;
    if (totalImages === 0) return 'At least one product image is required.';

    for (const v of draft.variants) {
      if (!v.name.trim()) return 'Variant name is required.';
      if (!v.sku.trim()) return 'Variant SKU is required.';
      if (!v.price || v.price.trim() === '' || Number(v.price) <= 0) {
        return `Variant "${v.name || 'unnamed'}" must have a valid price greater than 0.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const newImageFiles = images.map(img => img.file);
      const timeoutMs = 90_000 + newImageFiles.length * 30_000;
      await Promise.race([
        Promise.resolve(onSave({ draft, newImages: newImageFiles, removedImageUrls })),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => {
            reject(
              new Error(
                'Proses penyimpanan terlalu lama (timeout). Cek koneksi, lalu refresh halaman. Draft teks sudah tersimpan; gambar yang belum ter-upload perlu dipilih ulang.'
              )
            );
          }, timeoutMs);
        }),
      ]);
      if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      if (!draft.id) await clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save product';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (isDirty && typeof window !== 'undefined') {
      const confirmed = window.confirm('Perubahan belum tersimpan. Yakin ingin menutup form?');
      if (!confirmed) return;
    }
    if (!initialValue?.id && typeof window !== 'undefined') {
      sessionStorage.removeItem(ADMIN_PRODUCT_DRAFT_KEY);
      clearStoredImages(ADMIN_PRODUCT_IMAGE_KEY);
    }
    onClose();
  }, [saving, isDirty, initialValue?.id, onClose]);

  if (!isOpen) return null;

  const handleRemoveExisting = (url: string) => {
    setRemovedImageUrls(prev => [...prev, url]);
  };

  const activeExistingImages = existingImages.filter(img => !removedImageUrls.includes(img.url));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleRequestClose}
      ></div>
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">{draft.id ? 'Edit Product' : 'Add Product'}</h3>
            <p className="mt-1 text-sm text-gray-600">Create or update product details, variants, and images.</p>
          </div>
          <button
            onClick={handleRequestClose}
            disabled={saving}
            className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {!isOnline && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-100/60 p-3 text-xs text-amber-900">
                Koneksi internet terputus. Perubahan tidak bisa disimpan sampai online kembali.
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* IMAGE SECTION - NOW AT TOP */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <ProductImageUpload
                images={images}
                existingImages={activeExistingImages}
                maxImages={3}
                onChange={setImages}
                onRemoveExisting={handleRemoveExisting}
              />
            </div>

            {/* PRODUCT DETAILS */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-600">Name</span>
                    <input
                      value={draft.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setDraft((prev) => {
                          const nextSlug = slugTouched ? prev.slug : slugify(name);
                          return { ...prev, name, slug: nextSlug };
                        });
                      }}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Product name"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-600">Slug</span>
                    <input
                      value={draft.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setDraft((prev) => ({ ...prev, slug: e.target.value }));
                      }}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="product-slug"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-600">Product SKU</span>
                  <input
                    value={draft.sku}
                    onChange={(e) => setDraft((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="PROD-001"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-600">Category</span>
                  <select
                    value={draft.category_id ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, category_id: e.target.value ? Number(e.target.value) : null }))}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-600">Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[96px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Optional description"
                  />
                </label>

                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">Active</p>
                    <p className="text-xs text-gray-600">Inactive products won't show on Shop page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative h-7 w-12 rounded-full transition-colors ${draft.is_active ? 'bg-primary' : 'bg-gray-100'}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${draft.is_active ? 'left-6' : 'left-1'}`}
                    />
                  </button>
                </div>
              </div>

              {/* VARIANTS SECTION */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Variants</p>
                    <p className="text-xs text-gray-600">Each variant must have a unique SKU.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        variants: [...prev.variants, { name: '', sku: '', price: '', stock: 0 }],
                      }))
                    }
                    className="rounded-lg bg-[#ff4b86] px-3 py-2 text-xs font-bold text-white hover:bg-[#e63d75]"
                  >
                    Add Variant
                  </button>
                </div>

                <div className="mt-4 max-h-[400px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="text-[10px] uppercase text-gray-600">
                      <tr>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">SKU</th>
                        <th className="py-2 pr-3">Price</th>
                        <th className="py-2 pr-3">Stock</th>
                        <th className="py-2 pr-3">Size</th>
                        <th className="py-2 pr-3">Color</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {draft.variants.map((v, idx) => (
                        <tr key={v.id ?? `new-${idx}`}>
                          <td className="py-2 pr-3">
                            <input
                              value={v.name}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-36 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={v.sku}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next[idx] = { ...next[idx], sku: e.target.value.toUpperCase() };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-32 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrency(v.price)}
                              onChange={(e) => {
                                const rawValue = parseCurrency(e.target.value);
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next[idx] = { ...next[idx], price: rawValue };
                                  return { ...prev, variants: next };
                                });
                              }}
                              className="w-28 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                              placeholder="50.000"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={String(v.stock)}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  const stock = Number(e.target.value);
                                  next[idx] = { ...next[idx], stock: Number.isFinite(stock) ? stock : 0 };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={v.size ?? ''}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next[idx] = { ...next[idx], size: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={v.color ?? ''}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next[idx] = { ...next[idx], color: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              disabled={saving || draft.variants.length <= 1}
                              onClick={() =>
                                setDraft((prev) => {
                                  const next = prev.variants.slice();
                                  next.splice(idx, 1);
                                  return { ...prev, variants: next };
                                })
                              }
                              className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold hover:bg-white/15 disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-6 py-5">
          <p className="text-xs text-gray-600">Saving will apply changes to products, variants, and images.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestClose}
              disabled={saving}
              className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
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
