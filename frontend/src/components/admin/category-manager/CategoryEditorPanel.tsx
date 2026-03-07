import type { Dispatch, SetStateAction } from 'react';
import { slugify } from '../../../utils/merchant';
import type { Category, CategoryDraft } from './categoryManagerTypes';

type CategoryEditorPanelProps = {
  editingId: number | null;
  draft: CategoryDraft;
  slugTouched: boolean;
  loading: boolean;
  parentOptions: Category[];
  setDraft: Dispatch<SetStateAction<CategoryDraft>>;
  setSlugTouched: Dispatch<SetStateAction<boolean>>;
  onNew: () => void;
  onSave: () => void;
};

export function CategoryEditorPanel({
  editingId,
  draft,
  slugTouched,
  loading,
  parentOptions,
  setDraft,
  setSlugTouched,
  onNew,
  onSave,
}: CategoryEditorPanelProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-bold">{editingId ? 'Edit Category' : 'New Category'}</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            placeholder="Category name"
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
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            placeholder="category-slug"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">Parent Category</span>
          <select
            value={draft.parent_id ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, parent_id: event.target.value ? Number(event.target.value) : null }))
            }
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
          >
            <option value="">No parent</option>
            {parentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))}
            className="h-4 w-4 rounded border-gray-200 bg-gray-50"
          />
          <span className="text-sm text-gray-700">Active</span>
        </div>

        <div className="flex gap-2">
          {editingId ? (
            <button
              type="button"
              onClick={onNew}
              disabled={loading}
              className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="rounded-lg bg-[#ff4b86] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
