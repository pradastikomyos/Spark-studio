import type { Dispatch, SetStateAction } from 'react';
import { EventScheduleCard } from '../../../components/events/EventScheduleCard';
import type { EventScheduleItem } from '../../../hooks/useEventSchedule';
import { SCHEDULE_BUCKET_ID } from './eventsScheduleManagerHelpers';
import type { ScheduleFormState } from './eventsScheduleManagerTypes';

type EventsScheduleEditorPanelProps = {
  previewItem: EventScheduleItem;
  editingItem: EventScheduleItem | null;
  form: ScheduleFormState;
  saving: boolean;
  uploading: boolean;
  setForm: Dispatch<SetStateAction<ScheduleFormState>>;
  onUploadImageFile: (file: File) => void;
  onSave: () => void;
  onReset: () => void;
};

export function EventsScheduleEditorPanel({
  previewItem,
  editingItem,
  form,
  saving,
  uploading,
  setForm,
  onUploadImageFile,
  onSave,
  onReset,
}: EventsScheduleEditorPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Live Preview</h3>
        <EventScheduleCard item={previewItem} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{editingItem ? 'Edit Item' : 'Create Item'}</h3>
          {editingItem ? <span className="text-xs text-gray-500">ID: {editingItem.id}</span> : null}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Title</label>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="ux-transition-color min-h-[90px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              placeholder="Short description"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Date</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))}
                className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Time Label</label>
              <input
                value={form.time_label}
                onChange={(event) => setForm((current) => ({ ...current, time_label: event.target.value }))}
                className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
                placeholder="10:00 AM - 4:00 PM"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Category</label>
              <input
                list="event-categories"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
                placeholder="Workshop"
              />
              <datalist id="event-categories">
                <option value="Workshop" />
                <option value="Seminar" />
                <option value="Masterclass" />
                <option value="Exhibition" />
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Placeholder Icon</label>
              <input
                list="event-icons"
                value={form.placeholder_icon}
                onChange={(event) => setForm((current) => ({ ...current, placeholder_icon: event.target.value }))}
                className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
                placeholder="photo_camera"
              />
              <datalist id="event-icons">
                <option value="photo_camera" />
                <option value="palette" />
                <option value="styler" />
                <option value="celebration" />
                <option value="local_activity" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Coming Soon</p>
                <p className="text-xs text-gray-500">Show badge on card</p>
              </div>
              <input
                type="checkbox"
                checked={form.is_coming_soon}
                onChange={(event) => setForm((current) => ({ ...current, is_coming_soon: event.target.checked }))}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Visible</p>
                <p className="text-xs text-gray-500">Show on /events</p>
              </div>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                className="h-4 w-4"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">CTA Text</label>
            <input
              value={form.button_text}
              onChange={(event) => setForm((current) => ({ ...current, button_text: event.target.value }))}
              className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              placeholder="Register"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">CTA URL (optional)</label>
            <input
              type="url"
              value={form.button_url}
              onChange={(event) => setForm((current) => ({ ...current, button_url: event.target.value }))}
              className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-gray-500">If empty, button will appear disabled.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))}
                className="ux-transition-color w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
              />
              <p className="mt-1 text-xs text-gray-500">Prefer drag ordering; this is advanced.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  onUploadImageFile(file);
                  event.currentTarget.value = '';
                }}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-sm file:font-bold file:text-gray-800 hover:file:bg-gray-300"
              />
              {form.image_url ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a href={form.image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:text-gray-900">
                    Open image
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, image_url: '', image_path: '', image_bucket: SCHEDULE_BUCKET_ID }))
                    }
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || uploading}
              className="flex-1 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {editingItem ? (
              <button
                type="button"
                onClick={onReset}
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
