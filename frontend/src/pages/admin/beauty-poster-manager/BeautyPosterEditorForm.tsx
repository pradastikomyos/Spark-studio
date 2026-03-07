import type { MutableRefObject } from 'react';
import type { BeautyPosterRow } from './beautyPosterTypes';

type BeautyPosterEditorFormProps = {
  loading: boolean;
  saving: boolean;
  posters: BeautyPosterRow[];
  selectedPoster: BeautyPosterRow | null;
  title: string;
  slug: string;
  isActive: boolean;
  uploadInputRef: MutableRefObject<HTMLInputElement | null>;
  onOpenEditor: (poster: BeautyPosterRow | null) => void;
  onChangeTitle: (value: string) => void;
  onChangeSlug: (value: string) => void;
  onToggleActive: () => void;
  onOpenUrlModal: () => void;
  onUploadFile: (file: File) => void;
};

export function BeautyPosterEditorForm({
  loading,
  saving,
  posters,
  selectedPoster,
  title,
  slug,
  isActive,
  uploadInputRef,
  onOpenEditor,
  onChangeTitle,
  onChangeSlug,
  onToggleActive,
  onOpenUrlModal,
  onUploadFile,
}: BeautyPosterEditorFormProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Poster</label>
          <select
            value={selectedPoster ? String(selectedPoster.id) : 'new'}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'new') {
                onOpenEditor(null);
                return;
              }
              const id = Number(next);
              onOpenEditor(posters.find((poster) => poster.id === id) ?? null);
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            disabled={loading || saving}
          >
            <option value="new">New poster</option>
            {posters.map((poster) => (
              <option key={poster.id} value={String(poster.id)}>
                {poster.title}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
          <input
            value={title}
            onChange={(event) => onChangeTitle(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            placeholder="Poster title"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Slug</label>
          <input
            value={slug}
            onChange={(event) => onChangeSlug(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
            placeholder="beauty-poster-slug"
          />
        </div>
        <div className="md:col-span-1 flex items-end justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Active</label>
            <button
              type="button"
              onClick={onToggleActive}
              className={`relative h-11 w-full rounded-xl border px-4 text-sm font-bold transition-colors ${
                isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Poster Image</label>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px] mt-0.5">info</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-900 mb-1">Recommended Poster Specs:</p>
                <ul className="text-xs text-blue-800 space-y-0.5">
                  <li>• Aspect ratio: <span className="font-semibold">4:5</span> (portrait)</li>
                  <li>• Ideal resolution: <span className="font-semibold">1600 × 2000px</span></li>
                  <li>• Minimum: <span className="font-semibold">1200 × 1500px</span></li>
                  <li>• Format: JPG, PNG, or WebP</li>
                  <li>• Max size: <span className="font-semibold">5MB</span></li>
                </ul>
                <p className="mt-2 text-[11px] text-blue-900/80">You can use a temporary stock-image URL (Unsplash/Pexels) for now.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadFile(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={onOpenUrlModal}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Use URL
          </button>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
