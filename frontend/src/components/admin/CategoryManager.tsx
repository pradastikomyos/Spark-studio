import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../utils/merchant';

type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type CategoryDraft = {
  id?: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent_id: number | null;
};

type CategoryManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export default function CategoryManager({ isOpen, onClose, onUpdate }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>({ name: '', slug: '', is_active: true, parent_id: null });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<number[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (e) {
      console.error('Error fetching categories:', e);
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useMemo(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setDraft({
      id: category.id,
      name: category.name,
      slug: category.slug,
      is_active: category.is_active,
      parent_id: category.parent_id,
    });
    setSlugTouched(true);
    setError(null);
  };

  const handleNew = () => {
    setEditingId(null);
    setDraft({ name: '', slug: '', is_active: true, parent_id: null });
    setSlugTouched(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError('Category name is required');
      return;
    }
    if (!draft.slug.trim()) {
      setError('Category slug is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (draft.id) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: draft.name,
            slug: draft.slug,
            is_active: draft.is_active,
            parent_id: draft.parent_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: draft.name,
            slug: draft.slug,
            is_active: draft.is_active,
            parent_id: draft.parent_id,
          });

        if (error) throw error;
      }

      await fetchCategories();
      onUpdate();
      setEditingId(null);
      setDraft({ name: '', slug: '', is_active: true, parent_id: null });
      setSlugTouched(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Products using it will need reassignment.')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCategories();
      onUpdate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const parentOptions = useMemo(() => {
    return categories
      .filter((cat) => cat.parent_id === null && cat.id !== editingId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, editingId]);

  const parents = useMemo(() => {
    return categories
      .filter((cat) => cat.parent_id === null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number, Category[]>();
    categories
      .filter((cat) => cat.parent_id !== null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((child) => {
        const parentId = child.parent_id as number;
        const list = map.get(parentId) ?? [];
        list.push(child);
        map.set(parentId, list);
      });
    return map;
  }, [categories]);

  useEffect(() => {
    if (!editingId) return;
    const editing = categories.find((cat) => cat.id === editingId);
    if (!editing) return;
    const parentId = editing.parent_id ?? editing.id;
    setExpandedParents((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
  }, [categories, editingId]);

  const orphanChildren = useMemo(() => {
    const parentIds = new Set(parents.map((cat) => cat.id));
    return categories
      .filter((cat) => cat.parent_id !== null && !parentIds.has(cat.parent_id))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, parents]);

  const parentNameMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.id, cat.name]));
  }, [categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">Category Management</h3>
            <p className="mt-1 text-sm text-gray-600">Create, edit, or delete product categories.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-bold">
              {editingId ? 'Edit Category' : 'New Category'}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-600">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft((prev) => ({
                      ...prev,
                      name,
                      slug: slugTouched ? prev.slug : slugify(name),
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
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
                  placeholder="category-slug"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-600">Parent Category</span>
                <select
                  value={draft.parent_id ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, parent_id: e.target.value ? Number(e.target.value) : null }))}
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
                  onChange={(e) => setDraft((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-200 bg-gray-50"
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>
              <div className="flex gap-2">
                {editingId && (
                  <button
                    onClick={handleNew}
                    disabled={loading}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-lg bg-[#ff4b86] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading && categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                      No categories found. Create your first one above.
                    </td>
                  </tr>
                ) : (
                  <>
                    {parents.map((parent) => {
                      const children = childrenByParent.get(parent.id) ?? [];
                      const showToggle = children.length > 0;
                      const isExpanded = expandedParents.includes(parent.id);
                      const toggleExpanded = () => {
                        setExpandedParents((prev) =>
                          prev.includes(parent.id) ? prev.filter((id) => id !== parent.id) : [...prev, parent.id]
                        );
                      };
                      return (
                        <Fragment key={parent.id}>
                          <tr key={parent.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {showToggle ? (
                                  <button
                                    type="button"
                                    onClick={toggleExpanded}
                                    className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200"
                                  >
                                    {isExpanded ? '▾' : '▸'}
                                  </button>
                                ) : (
                                  <span className="h-6 w-6" />
                                )}
                                {showToggle ? (
                                  <button
                                    type="button"
                                    onClick={toggleExpanded}
                                    className="text-left font-medium text-gray-900"
                                  >
                                    {parent.name}
                                  </button>
                                ) : (
                                  <span className="font-medium text-gray-900">{parent.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">-</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{parent.slug}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${parent.is_active
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-gray-500/20 text-gray-600'
                                  }`}
                              >
                                {parent.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleEdit(parent)}
                                disabled={loading}
                                className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(parent.id)}
                                disabled={loading}
                                className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                          {isExpanded &&
                            children.map((child) => (
                              <tr key={child.id} className="bg-gray-50/60">
                                <td className="px-4 py-3 font-medium pl-8">└─ {child.name}</td>
                                <td className="px-4 py-3 text-xs text-gray-600">{parent.name}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{child.slug}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${child.is_active
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-gray-500/20 text-gray-600'
                                      }`}
                                  >
                                    {child.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleEdit(child)}
                                    disabled={loading}
                                    className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(child.id)}
                                    disabled={loading}
                                    className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                    {orphanChildren.map((child) => (
                      <tr key={child.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">— {child.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{parentNameMap.get(child.parent_id ?? 0) ?? '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{child.slug}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${child.is_active
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-gray-500/20 text-gray-600'
                              }`}
                          >
                            {child.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleEdit(child)}
                            disabled={loading}
                            className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(child.id)}
                            disabled={loading}
                            className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
