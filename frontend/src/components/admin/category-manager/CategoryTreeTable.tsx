import { Fragment } from 'react';
import type { Category } from './categoryManagerTypes';

type CategoryTreeTableProps = {
  categories: Category[];
  loading: boolean;
  parents: Category[];
  childrenByParent: Map<number, Category[]>;
  orphanChildren: Category[];
  parentNameMap: Map<number, string>;
  expandedParents: number[];
  onToggleExpanded: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
};

const StatusPill = ({ active }: { active: boolean }) => (
  <span
    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
      active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-600'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

export function CategoryTreeTable({
  categories,
  loading,
  parents,
  childrenByParent,
  orphanChildren,
  parentNameMap,
  expandedParents,
  onToggleExpanded,
  onEdit,
  onDelete,
}: CategoryTreeTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
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

                return (
                  <Fragment key={parent.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {showToggle ? (
                            <button
                              type="button"
                              onClick={() => onToggleExpanded(parent.id)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200"
                            >
                              {isExpanded ? '▾' : '▸'}
                            </button>
                          ) : (
                            <span className="h-6 w-6" />
                          )}
                          {showToggle ? (
                            <button type="button" onClick={() => onToggleExpanded(parent.id)} className="text-left font-medium text-gray-900">
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
                        <StatusPill active={parent.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onEdit(parent)}
                          disabled={loading}
                          className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(parent.id)}
                          disabled={loading}
                          className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {isExpanded
                      ? children.map((child) => (
                          <tr key={child.id} className="bg-gray-50/60">
                            <td className="px-4 py-3 pl-8 font-medium">└─ {child.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{parent.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{child.slug}</td>
                            <td className="px-4 py-3">
                              <StatusPill active={child.is_active} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => onEdit(child)}
                                disabled={loading}
                                className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(child.id)}
                                disabled={loading}
                                className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}

              {orphanChildren.map((child) => (
                <tr key={child.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">— {child.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{parentNameMap.get(child.parent_id ?? 0) ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{child.slug}</td>
                  <td className="px-4 py-3">
                    <StatusPill active={child.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(child)}
                      disabled={loading}
                      className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(child.id)}
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
  );
}
