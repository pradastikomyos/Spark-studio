import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import type { Banner, BannerFormData, BannerType } from './bannerManagerTypes';

type BannerFormModalProps = {
  open: boolean;
  editingBanner: Banner | null;
  formData: BannerFormData;
  uploading: boolean;
  uploadingTitle: boolean;
  saving: boolean;
  setFormData: Dispatch<SetStateAction<BannerFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onTitleImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function BannerFormModal({
  open,
  editingBanner,
  formData,
  uploading,
  uploadingTitle,
  saving,
  setFormData,
  onClose,
  onSubmit,
  onImageUpload,
  onTitleImageUpload,
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
            <label className="mb-2 block text-sm font-bold text-gray-900">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-neutral-900"
              placeholder="Enter banner title (optional)"
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
              <option value="process">Process (Hero Slider)</option>
              <option value="stage">Stage (Carousel)</option>
              <option value="promo">Promo</option>
              <option value="events">Events (Hero Slider)</option>
              <option value="shop">Shop (Hero Slider)</option>
              <option value="spark-map">Spark Map</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Media (Image/Video) *</label>

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
                    {formData.banner_type === 'process' ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">1920 x 1080px</span> (16:9 aspect ratio)</li>
                        <li>• Best for: Process sliders on OnStage page (under the ticket button)</li>
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
                    {formData.banner_type === 'spark-map' ? (
                      <>
                        <li>• Resolution: <span className="font-semibold">Flexible</span> (often portrait)</li>
                        <li>• Best for: The stage map inside the Booking Flow</li>
                      </>
                    ) : null}
                    <li>• Format: JPG, PNG, WebP, MP4, or WebM</li>
                    <li>• Max file size: <span className="font-semibold">10MB</span> (for video) / <span className="font-semibold">5MB</span> (for image)</li>
                    <li>• Tip: Use high-quality media for best display on all devices</li>
                  </ul>
                </div>
              </div>
            </div>

            {formData.image_url ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-gray-200">
                {formData.image_url.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                  <video src={formData.image_url} className="h-48 w-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={formData.image_url} alt="Preview" className="h-48 w-full object-cover" />
                )}
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-600">✓ Media uploaded successfully</p>
                </div>
              </div>
            ) : null}

            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={onImageUpload}
              disabled={uploading}
              className="w-full text-sm text-gray-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#ff4b86] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#ff6a9a] disabled:opacity-50"
            />

            {uploading ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-neutral-900" />
                <p className="text-sm text-gray-600">Uploading media...</p>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-900">Title Image (Optional Typography Image)</label>
            <div className="mb-3 text-xs text-gray-500 space-y-1">
              <p>Only for Process/Stage Banners. Upload a transparent PNG/Webp for the large isolated typography.</p>
              <ul className="list-disc pl-4 mt-1 text-blue-700">
                <li><span className="font-semibold">Process Title Image (e.g. GLAM IN PROGRESS):</span> Recommended size is <span className="font-bold">800-1200px wide</span> (approx. 3:1 or 4:1 ratio).</li>
                <li><span className="font-semibold">Stage Text/Number:</span> Recommended size is <span className="font-bold">400-600px wide</span>.</li>
              </ul>
            </div>

            {formData.title_image_url ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-4">
                <img src={formData.title_image_url} alt="Title Preview" className="h-24 w-full object-contain mix-blend-multiply" />
                <div className="mt-4 border-t border-gray-200 pt-2">
                  <p className="text-xs text-gray-600">✓ Title image uploaded</p>
                  <button 
                    type="button" 
                    onClick={() => setFormData(s => ({...s, title_image_url: ''}))}
                    className="mt-1 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : null}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onTitleImageUpload}
              disabled={uploadingTitle}
              className="w-full text-sm text-gray-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2 file:text-sm file:font-bold file:text-gray-900 hover:file:bg-gray-300 disabled:opacity-50"
            />

            {uploadingTitle ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-neutral-900" />
                <p className="text-sm text-gray-600">Uploading title image...</p>
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
