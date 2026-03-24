import type { Dispatch, SetStateAction } from 'react';
import { slugify } from '../../../utils/merchant';
import type { CategoryOption, ProductDraft } from './productFormModalTypes';

type ProductDetailsSectionProps = {
  draft: ProductDraft;
  slugTouched: boolean;
  categoryOptions: CategoryOption[];
  setDraft: Dispatch<SetStateAction<ProductDraft>>;
  setSlugTouched: Dispatch<SetStateAction<boolean>>;
};

export function ProductDetailsSection({
  draft,
  slugTouched,
  categoryOptions,
  setDraft,
  setSlugTouched,
}: ProductDetailsSectionProps) {
  const lineage: number[] = [];
  let currentId: number | null | undefined = draft.category_id;
  const visited = new Set<number>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    lineage.unshift(currentId);
    const cat = categoryOptions.find((c) => c.id === currentId);
    currentId = cat?.parent_id;
  }

  const rootId = lineage[0] ?? null;
  const subId = lineage[1] ?? null;
  const subsubId = lineage[2] ?? null;

  const rootOptions = categoryOptions.filter((c) => !c.parent_id);
  const subOptions = rootId ? categoryOptions.filter((c) => c.parent_id === rootId) : [];
  const subsubOptions = subId ? categoryOptions.filter((c) => c.parent_id === subId) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Name</span>
          <input
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              setDraft((current) => ({
                ...current,
                name,
                slug: slugTouched ? current.slug : slugify(name),
              }));
            }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Product name"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Slug</span>
          <input
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setDraft((current) => ({ ...current, slug: event.target.value }));
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
          onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value.toUpperCase() }))}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="PROD-001"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-600">Category</span>
        <select
          value={rootId ?? ''}
          onChange={(event) => {
            const val = event.target.value ? Number(event.target.value) : null;
            setDraft((current) => ({ ...current, category_id: val }));
          }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Select category</option>
          {rootOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {subOptions.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">
            {rootId ? categoryOptions.find((c) => c.id === rootId)?.name + ' Subcategory' : 'Subcategory'}
          </span>
          <select
            value={subId ?? ''}
            onChange={(event) => {
              const val = event.target.value ? Number(event.target.value) : rootId;
              setDraft((current) => ({ ...current, category_id: val }));
            }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select subcategory</option>
            {subOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {subsubOptions.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Type</span>
          <select
            value={subsubId ?? ''}
            onChange={(event) => {
              const val = event.target.value ? Number(event.target.value) : subId;
              setDraft((current) => ({ ...current, category_id: val }));
            }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select type</option>
            {subsubOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-600">Description</span>
        <textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
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
          onClick={() => setDraft((current) => ({ ...current, is_active: !current.is_active }))}
          className={`relative h-7 w-12 rounded-full transition-colors ${draft.is_active ? 'bg-primary' : 'bg-gray-100'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${draft.is_active ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
}
