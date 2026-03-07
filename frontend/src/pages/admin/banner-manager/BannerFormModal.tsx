import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import type { Banner, BannerFormData, BannerType } from './bannerManagerTypes';

type BannerFormModalProps = {
  open: boolean;
  editingBanner: Banner | null;
  formData: BannerFormData;
  uploading: boolean;
  saving: boolean;
  setFormData: Dispatch<SetStateAction<BannerFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function BannerFormModal({
  open,
  editingBanner,
  formData,
  uploading,
  saving,
  setFormData,
  onClose,
  onSubmit,
  onImageUpload,
}: BannerFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} aria-label="Close" />
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl animate-fade-in-scale"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <h3 className="text-xl font-bold text-gray-900">{editingBanner ? 'Edit Banner' : 'Add New Banner'}</h3>
          <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
              placeholder="Enter banner title"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Subtitle</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(event) => setFormData((current) => ({ ...current, subtitle: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
              placeholder="Enter banner subtitle (optional)"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Banner Type *</label>
            <select
              value={formData.banner_type}
              onChange={(event) => setFormData((current) => ({ ...current, banner_type: event.target.value as BannerType }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
            >
              <option value="hero">Hero (Main Slider)</option>
              <option value="stage">Stage (Carousel)</option>
              <option value="promo">Promo</option>
              <option value="events">Events (Hero Slider)</option>
              <option value="shop">Shop (Hero Slider)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Image *</label>

            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[20px] text-blue-600">info</span>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-bold text-blue-900">Recommended Image Specifications:</p>
                  <ul className="space-y-0.5 text-xs text-blue-800">
                    {formData.banner_type === 'hero' ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">1920 x 1080px</span> (16:9 aspect ratio)</li>
                        <li>• Best for: Full-width hero sliders on OnStage page</li>
                      </>
                    ) : null}
                    {formData.banner_type === 'stage' ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">800 x 600px</span> (4:3 aspect ratio)</li>
                        <li>• Best for: Stage carousel cards</li>
                      </>
                    ) : null}
                    {(formData.banner_type === 'events' || formData.banner_type === 'shop') ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">1920 x 800px</span> (21:9 aspect ratio)</li>
                        <li>• Best for: Wide hero banners with text overlay</li>
                      </>
                    ) : null}
                    {formData.banner_type === 'promo' ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">1200 x 600px</span> (2:1 aspect ratio)</li>
                        <li>• Best for: Promotional banners</li>
                      </>
                    ) : null}
                    <li>• Format: JPG, PNG, or WebP</li>
                    <li>• Max file size: <span className="font-semibold">2MB</span></li>
                    <li>• Tip: Use high-quality images for best display on all devices</li>
                  </ul>
                </div>
              </div>
            </div>

            {formData.image_url ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-gray-200">
                <img src={formData.image_url} alt="Preview" className="h-48 w-full object-cover" />
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-600">✓ Image uploaded successfully</p>
                </div>
              </div>
            ) : null}

            <input
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              disabled={uploading}
              className="w-full text-sm text-gray-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#ff4b86] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#ff6a9a] disabled:opacity-50"
            />

            {uploading ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-neutral-900" />
                <p className="text-sm text-gray-600">Uploading image...</p>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Link URL</label>
            <input
              type="text"
              value={formData.link_url}
              onChange={(event) => setFormData((current) => ({ ...current, link_url: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
              placeholder="https://example.com (optional)"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(event) =>
                setFormData((current) => ({ ...current, display_order: Number.parseInt(event.target.value, 10) || 0 }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
              min="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(event) => setFormData((current) => ({ ...current, is_active: event.target.checked }))}
              className="rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
              Active (visible on website)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !formData.image_url}
              className="flex-1 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
