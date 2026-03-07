import { CategoryEditorPanel } from './category-manager/CategoryEditorPanel';
import { CategoryTreeTable } from './category-manager/CategoryTreeTable';
import { useCategoryManagerController } from './category-manager/useCategoryManagerController';
import type { CategoryManagerProps } from './category-manager/categoryManagerTypes';

export default function CategoryManager({ isOpen, onClose, onUpdate }: CategoryManagerProps) {
  const controller = useCategoryManagerController({ isOpen, onUpdate });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl animate-fade-in-scale">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">Category Management</h3>
            <p className="mt-1 text-sm text-gray-600">Create, edit, or delete product categories.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold hover:bg-gray-100">
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {controller.error ? (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{controller.error}</div>
          ) : null}

          <CategoryEditorPanel
            editingId={controller.editingId}
            draft={controller.draft}
            slugTouched={controller.slugTouched}
            loading={controller.loading}
            parentOptions={controller.parentOptions}
            setDraft={controller.setDraft}
            setSlugTouched={controller.setSlugTouched}
            onNew={controller.handleNew}
            onSave={() => void controller.handleSave()}
          />

          <CategoryTreeTable
            categories={controller.categories}
            loading={controller.loading}
            parents={controller.parents}
            childrenByParent={controller.childrenByParent}
            orphanChildren={controller.orphanChildren}
            parentNameMap={controller.parentNameMap}
            expandedParents={controller.expandedParents}
            onToggleExpanded={controller.toggleExpanded}
            onEdit={controller.handleEdit}
            onDelete={(id) => void controller.handleDelete(id)}
          />
        </div>
      </div>
    </div>
  );
}
