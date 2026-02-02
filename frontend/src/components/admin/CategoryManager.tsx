import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../utils/merchant';

type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type CategoryDraft = {
  id?: number;
  name: string;
  slug: string;
  is_active: boolean;
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
  const [draft, setDraft] = useState<CategoryDraft>({ name: '', slug: '', is_active: true });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    });
    setSlugTouched(true);
    setError(null);
  };

  const handleNew = () => {
    setEditingId(null);
    setDraft({ name: '', slug: '', is_active: true });
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
          });
        
        if (error) throw error;
      }

      await fetchCategories();
      onUpdate();
      setEditingId(null);
      setDraft({ name: '', slug: '', is_active: true });
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="category-slug"
                />
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
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-dark disabled:opacity-50"
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
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading && categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                      No categories found. Create your first one above.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                            cat.is_active
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-gray-500/20 text-gray-600'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(cat)}
                          disabled={loading}
                          className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={loading}
                          className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/30 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
