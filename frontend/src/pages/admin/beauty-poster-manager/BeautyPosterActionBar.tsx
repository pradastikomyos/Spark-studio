type BeautyPosterActionBarProps = {
  editorTitle: string;
  saving: boolean;
  isDirty: boolean;
  onCancel: () => void;
  onApply: () => void;
  onSave: () => void;
};

export function BeautyPosterActionBar({
  editorTitle,
  saving,
  isDirty,
  onCancel,
  onApply,
  onSave,
}: BeautyPosterActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold truncate">{editorTitle}</p>
          <p className="text-[11px] text-gray-500 truncate">
            Upload a poster first, then click products to add → drag tagged items onto the poster (use corner icon to resize).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-bold text-[#e63d75] hover:bg-pink-100 disabled:opacity-50"
            disabled={saving || !isDirty}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-[#ff4b86] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
