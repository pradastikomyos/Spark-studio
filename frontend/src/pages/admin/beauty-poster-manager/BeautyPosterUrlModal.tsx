type BeautyPosterUrlModalProps = {
  open: boolean;
  urlDraft: string;
  onChangeUrl: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

export function BeautyPosterUrlModal({
  open,
  urlDraft,
  onChangeUrl,
  onClose,
  onApply,
}: BeautyPosterUrlModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Poster Image URL</p>
            <p className="text-sm font-semibold text-gray-900 truncate">Use a temporary stock image</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 md:p-6 space-y-3">
          <input
            value={urlDraft}
            onChange={(event) => onChangeUrl(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            placeholder="https://images.unsplash.com/..."
          />
          <p className="text-xs text-gray-500">
            Tip: use a direct image URL (e.g. <span className="font-semibold">images.unsplash.com</span> or <span className="font-semibold">images.pexels.com</span>).
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={onApply} className="rounded-xl bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a]">
              Apply URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
