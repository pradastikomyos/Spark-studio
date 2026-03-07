import type { EventScheduleItem } from '../../../hooks/useEventSchedule';
import type { ScheduleFormState } from './eventsScheduleManagerTypes';

export const REQUEST_TIMEOUT_MS = 60000;
export const UPLOAD_TIMEOUT_MS = 120000;
export const SCHEDULE_BUCKET_ID = 'events-schedule';

export function buildFormState(item?: EventScheduleItem | null): ScheduleFormState {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    event_date: item?.event_date ?? '',
    time_label: item?.time_label ?? '',
    category: item?.category ?? 'Workshop',
    image_url: item?.image_url ?? '',
    image_path: item?.image_path ?? '',
    image_bucket: item?.image_bucket ?? SCHEDULE_BUCKET_ID,
    placeholder_icon: item?.placeholder_icon ?? 'photo_camera',
    is_coming_soon: item?.is_coming_soon ?? true,
    button_text: item?.button_text ?? 'Register',
    button_url: item?.button_url ?? '',
    sort_order: item?.sort_order ?? 0,
    is_active: item?.is_active ?? true,
  };
}

export function toPreviewItem(form: ScheduleFormState, id: number): EventScheduleItem {
  const now = new Date().toISOString();
  return {
    id,
    title: form.title || 'Untitled Event',
    description: form.description || 'Add a short description for this event.',
    event_date: form.event_date || '2026-01-01',
    time_label: form.time_label || '10:00 AM - 4:00 PM',
    category: form.category || 'Workshop',
    image_url: form.image_url || null,
    image_path: form.image_path || null,
    image_bucket: form.image_bucket || SCHEDULE_BUCKET_ID,
    placeholder_icon: form.placeholder_icon || null,
    is_coming_soon: form.is_coming_soon,
    button_text: form.button_text || 'Register',
    button_url: form.button_url || null,
    sort_order: form.sort_order,
    is_active: form.is_active,
    created_at: now,
    updated_at: now,
  };
}
