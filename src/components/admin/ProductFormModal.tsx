import { useEffect, useMemo, useState } from 'react';
import { slugify } from '../../utils/merchant';

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
  online_price: string;
  offline_price: string;
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
  type: 'fashion' | 'beauty' | 'other';
  sku: string;
  is_active: boolean;
  variants: ProductVariantDraft[];
};

type ProductFormModalProps = {
  isOpen: boolean;
  categories: CategoryOption[];
  initialValue?: ProductDraft | null;
  onClose: () => void;
  onSave: (payload: { draft: ProductDraft; imageFile: File | null }) => Promise<void> | void;
};

const emptyDraft = (): ProductDraft => ({
  name: '',
  slug: '',
  description: '',
  category_id: null,
  type: 'other',
  sku: '',
  is_active: true,
  variants: [{ name: 'Default', sku: '', online_price: '', offline_price: '', stock: 0 }],
});

export default function ProductFormModal(props: ProductFormModalProps) {
  const { isOpen, categories, initialValue, onClose, onSave } = props;
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const next = initialValue ? { ...initialValue } : emptyDraft();
    setDraft(next);
    setImageFile(null);
    setSlugTouched(Boolean(initialValue?.slug));
    setError(null);
    setSaving(false);
  }, [isOpen, initialValue]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => c.is_active !== false)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  if (!isOpen) return null;

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Name is required.';
    if (!draft.slug.trim()) return 'Slug is required.';
    if (!draft.sku.trim()) return 'Product SKU is required.';
    if (!draft.category_id) return 'Category is required.';
    if (!draft.variants.length) return 'At least one variant is required.';
    for (const v of draft.variants) {
      if (!v.name.trim()) return 'Variant name is required.';
      if (!v.sku.trim()) return 'Variant SKU is required.';
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
      await onSave({ draft, imageFile });
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save product';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60" onClick={() => !saving && onClose()}></div>
      <div className="relative w-full max-w-4xl rounded-xl border border-white/10 bg-surface-dark text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">{draft.id ? 'Edit Product' : 'Add Product'}</h3>
            <p className="mt-1 text-sm text-gray-400">Create or update product details, variants, and image.</p>
          </div>
          <button
            onClick={() => onClose()}
            disabled={saving}
            className="rounded-lg bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-400">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft((prev) => {
                      const nextSlug = slugTouched ? prev.slug : slugify(name);
                      return { ...prev, name, slug: nextSlug };
                    });
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Product name"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-400">Slug</span>
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="product-slug"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-400">Product SKU</span>
                <input
                  value={draft.sku}
                  onChange={(e) => setDraft((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="PROD-001"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-400">Type</span>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value as ProductDraft['type'] }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="fashion">fashion</option>
                  <option value="beauty">beauty</option>
                  <option value="other">other</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-400">Category</span>
              <select
                value={draft.category_id ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, category_id: e.target.value ? Number(e.target.value) : null }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
              <span className="text-xs font-bold text-gray-400">Description</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[96px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Optional description"
              />
            </label>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-bold">Active</p>
                <p className="text-xs text-gray-400">Inactive products won\u2019t show on Shop page.</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative h-7 w-12 rounded-full transition-colors ${draft.is_active ? 'bg-primary' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${draft.is_active ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Product Image</p>
                  <p className="text-xs text-gray-400">JPG/PNG/WEBP, max 2MB.</p>
                </div>
                <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">
                  Choose File
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">{imageFile ? imageFile.name : 'No file selected'}</p>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="text-xs font-bold text-gray-300 hover:text-white"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Variants</p>
                <p className="text-xs text-gray-400">Each variant must have a unique SKU.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    variants: [...prev.variants, { name: '', sku: '', online_price: '', offline_price: '', stock: 0 }],
                  }))
                }
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Add Variant
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="text-[10px] uppercase text-gray-400">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Online</th>
                    <th className="py-2 pr-3">Offline</th>
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
                          className="w-36 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
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
                          className="w-32 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={v.online_price}
                          onChange={(e) =>
                            setDraft((prev) => {
                              const next = prev.variants.slice();
                              next[idx] = { ...next[idx], online_price: e.target.value };
                              return { ...prev, variants: next };
                            })
                          }
                          className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={v.offline_price}
                          onChange={(e) =>
                            setDraft((prev) => {
                              const next = prev.variants.slice();
                              next[idx] = { ...next[idx], offline_price: e.target.value };
                              return { ...prev, variants: next };
                            })
                          }
                          className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
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
                          className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
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
                          className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
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
                          className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 outline-none focus:border-primary"
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
                          className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/15 disabled:opacity-40"
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

        <div className="flex items-center justify-between border-t border-white/10 px-6 py-5">
          <p className="text-xs text-gray-400">Saving will apply changes to products and variants.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onClose()}
              disabled={saving}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
