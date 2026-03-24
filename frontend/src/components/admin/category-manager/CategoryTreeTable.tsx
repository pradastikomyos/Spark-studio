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

const CategoryRow = ({
  category,
  level,
  parentName,
  loading,
  childrenByParent,
  expandedParents,
  onToggleExpanded,
  onEdit,
  onDelete,
}: {
  category: Category;
  level: number;
  parentName: string | null;
  loading: boolean;
  childrenByParent: Map<number, Category[]>;
  expandedParents: number[];
  onToggleExpanded: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}) => {
  const children = childrenByParent.get(category.id) ?? [];
  const showToggle = children.length > 0;
  const isExpanded = expandedParents.includes(category.id);
  const paddingLeft = level === 0 ? '1rem' : `${1 + level * 1.5}rem`;

  return (
    <Fragment>
      <tr className={`hover:bg-gray-50 ${level > 0 ? 'bg-gray-50/60' : ''}`}>
        <td className="py-3 pr-4" style={{ paddingLeft }}>
          <div className="flex items-center gap-2">
            {level > 0 && <span className="text-gray-400">└─</span>}
            {showToggle ? (
              <button
                type="button"
                onClick={() => onToggleExpanded(category.id)}
                className={`flex items-center justify-center rounded bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 ${
                  level === 0 ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-[10px]'
                }`}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className={level === 0 ? 'inline-block h-6 w-6' : 'inline-block h-5 w-5'} />
            )}
            {showToggle ? (
              <button
                type="button"
                onClick={() => onToggleExpanded(category.id)}
                className={`text-left ${level === 0 ? 'font-medium' : ''} text-gray-900`}
              >
                {category.name}
              </button>
            ) : (
              <span className={`${level === 0 ? 'font-medium' : ''} text-gray-900`}>{category.name}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{parentName ?? '-'}</td>
        <td className="px-4 py-3 font-mono text-xs text-gray-600">{category.slug}</td>
        <td className="px-4 py-3">
          <StatusPill active={category.is_active} />
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={loading}
            className="mr-2 rounded bg-gray-100 px-2 py-1 text-xs font-bold hover:bg-white/15 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            disabled={loading}
            className="rounded bg-[#ff4b86]/10 px-2 py-1 text-xs font-bold text-[#ff4b86] hover:bg-[#ff4b86]/20 disabled:opacity-50"
          >
            Delete
          </button>
        </td>
      </tr>
      {isExpanded &&
        children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            level={level + 1}
            parentName={category.name}
            loading={loading}
            childrenByParent={childrenByParent}
            expandedParents={expandedParents}
            onToggleExpanded={onToggleExpanded}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </Fragment>
  );
};

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
              {parents.map((parent) => (
                <CategoryRow
                  key={parent.id}
                  category={parent}
                  level={0}
                  parentName={null}
                  loading={loading}
                  childrenByParent={childrenByParent}
                  expandedParents={expandedParents}
                  onToggleExpanded={onToggleExpanded}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}

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
