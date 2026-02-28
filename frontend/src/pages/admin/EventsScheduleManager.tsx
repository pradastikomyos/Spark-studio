import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useToast } from '../../components/Toast';
import { withTimeout } from '../../utils/queryHelpers';
import { useEventSchedule, type EventScheduleItem } from '../../hooks/useEventSchedule';
import { EventScheduleCard } from '../../components/events/EventScheduleCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ScheduleFormState = {
  title: string;
  description: string;
  event_date: string;
  time_label: string;
  category: string;
  image_url: string;
  image_path: string;
  image_bucket: string;
  placeholder_icon: string;
  is_coming_soon: boolean;
  button_text: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
};

const REQUEST_TIMEOUT_MS = 60000;
const UPLOAD_TIMEOUT_MS = 120000;
const SCHEDULE_BUCKET_ID = 'events-schedule';

function buildFormState(item?: EventScheduleItem | null): ScheduleFormState {
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

function toPreviewItem(form: ScheduleFormState, id: number): EventScheduleItem {
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

function SortableRow({ item }: { item: EventScheduleItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 ${
        isDragging ? 'border-primary shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
          <p className="text-xs text-gray-500 truncate">
            {item.event_date} • {item.category}
          </p>
        </div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {item.is_active ? 'Active' : 'Hidden'}
      </span>
    </div>
  );
}

export default function EventsScheduleManager() {
  const { signOut, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: items = [], isLoading, error, refetch } = useEventSchedule({ includeInactive: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(() => buildFormState(null));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [orderItems, setOrderItems] = useState<EventScheduleItem[]>([]);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [applyingOrder, setApplyingOrder] = useState(false);

  useEffect(() => {
    setOrderItems(items.slice());
    setHasUnsavedOrder(false);
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderItems.findIndex((i) => i.id === active.id);
    const newIndex = orderItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrderItems((prev) => arrayMove(prev, oldIndex, newIndex));
    setHasUnsavedOrder(true);
  };

  const resetEditor = () => {
    setEditingItem(null);
    setForm(buildFormState(null));
  };

  const handleEdit = (item: EventScheduleItem) => {
    setEditingItem(item);
    setForm(buildFormState(item));
  };

  const invalidateScheduleQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.eventSchedule('admin') });
    queryClient.invalidateQueries({ queryKey: queryKeys.eventSchedule('public') });
  };

  const handleUploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `evt-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await withTimeout(
        supabase.storage.from(SCHEDULE_BUCKET_ID).upload(filePath, file, { upsert: true }),
        UPLOAD_TIMEOUT_MS,
        'Upload gambar terlalu lama (timeout). Coba lagi saat koneksi lebih stabil.'
      );
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(SCHEDULE_BUCKET_ID).getPublicUrl(filePath);
      setForm((prev) => ({ ...prev, image_url: publicUrl, image_path: filePath, image_bucket: SCHEDULE_BUCKET_ID }));
      showToast('success', 'Image uploaded');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const deleteImageIfPresent = async (bucketId: string | null | undefined, path: string | null | undefined) => {
    const safeBucket = bucketId || SCHEDULE_BUCKET_ID;
    const safePath = path || '';
    if (!safePath.trim()) return;

    const { error: removeError } = await supabase.storage.from(safeBucket).remove([safePath]);
    if (removeError) {
      throw removeError;
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    if (!form.description.trim()) {
      showToast('error', 'Description is required');
      return;
    }
    if (!form.event_date.trim()) {
      showToast('error', 'Event date is required');
      return;
    }
    if (!form.time_label.trim()) {
      showToast('error', 'Time label is required');
      return;
    }
    if (!form.category.trim()) {
      showToast('error', 'Category is required');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        const prevBucket = editingItem.image_bucket ?? SCHEDULE_BUCKET_ID;
        const prevPath = editingItem.image_path ?? '';
        const nextBucket = form.image_bucket || SCHEDULE_BUCKET_ID;
        const nextPath = form.image_path || '';

        const { error: updateError } = await withTimeout(
          supabase
            .from('events_schedule_items')
            .update({
              title: form.title,
              description: form.description,
              event_date: form.event_date,
              time_label: form.time_label,
              category: form.category,
              image_url: form.image_url || null,
              image_path: form.image_path || null,
              image_bucket: form.image_bucket || SCHEDULE_BUCKET_ID,
              placeholder_icon: form.placeholder_icon || null,
              is_coming_soon: form.is_coming_soon,
              button_text: form.button_text,
              button_url: form.button_url || null,
              sort_order: form.sort_order,
              is_active: form.is_active,
            })
            .eq('id', editingItem.id),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (updateError) throw updateError;
        showToast('success', 'Schedule item updated');

        // Cleanup old file if image changed or removed
        if (prevPath && (prevBucket !== nextBucket || prevPath !== nextPath)) {
          try {
            await deleteImageIfPresent(prevBucket, prevPath);
          } catch (cleanupError) {
            showToast('error', cleanupError instanceof Error ? cleanupError.message : 'Failed to cleanup old image');
          }
        }
      } else {
        const { error: insertError, data } = await withTimeout(
          supabase
            .from('events_schedule_items')
            .insert({
              title: form.title,
              description: form.description,
              event_date: form.event_date,
              time_label: form.time_label,
              category: form.category,
              image_url: form.image_url || null,
              image_path: form.image_path || null,
              image_bucket: form.image_bucket || SCHEDULE_BUCKET_ID,
              placeholder_icon: form.placeholder_icon || null,
              is_coming_soon: form.is_coming_soon,
              button_text: form.button_text,
              button_url: form.button_url || null,
              sort_order: form.sort_order,
              is_active: form.is_active,
            })
            .select('*')
            .single(),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (insertError) throw insertError;
        if (data) {
          setEditingItem(data as EventScheduleItem);
        }
        showToast('success', 'Schedule item created');
      }

      invalidateScheduleQueries();
      await refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save schedule item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: EventScheduleItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      setSaving(true);
      const { error: deleteError } = await withTimeout(
        supabase.from('events_schedule_items').delete().eq('id', item.id),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );
      if (deleteError) throw deleteError;
      showToast('success', 'Schedule item deleted');

      if (item.image_path) {
        try {
          await deleteImageIfPresent(item.image_bucket, item.image_path);
        } catch (cleanupError) {
          showToast('error', cleanupError instanceof Error ? cleanupError.message : 'Failed to cleanup image');
        }
      }
      if (editingItem?.id === item.id) {
        resetEditor();
      }
      invalidateScheduleQueries();
      await refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete schedule item');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyOrder = useCallback(async () => {
    if (!hasUnsavedOrder) return;
    try {
      setApplyingOrder(true);
      const updates = orderItems.map((item, index) =>
        supabase
          .from('events_schedule_items')
          .update({ sort_order: index })
          .eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const hadError = results.some((r) => r.error);
      if (hadError) {
        const first = results.find((r) => r.error)?.error;
        throw new Error(first?.message || 'Failed to update order');
      }

      showToast('success', 'Order updated');
      setHasUnsavedOrder(false);
      invalidateScheduleQueries();
      await refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setApplyingOrder(false);
    }
  }, [hasUnsavedOrder, orderItems, refetch, showToast]);

  const handleCancelOrder = () => {
    setOrderItems(items.slice());
    setHasUnsavedOrder(false);
  };

  const previewItem = useMemo(
    () => toPreviewItem(form, editingItem?.id ?? -1),
    [editingItem?.id, form]
  );

  if (!isAdmin && !isLoading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="events-schedule"
        title="Events Schedule Manager"
        onLogout={signOut}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to view this page.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="events-schedule"
      title="Events Schedule Manager"
      subtitle="WYSIWYG editor for Upcoming Schedule on /events"
      headerActions={
        <button
          onClick={resetEditor}
          className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Item
        </button>
      }
      onLogout={signOut}
    >
      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-sm text-red-700">{error instanceof Error ? error.message : 'Failed to load schedule items'}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Items</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  />
                </div>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No schedule items yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`${editingItem?.id === item.id ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
                    <EventScheduleCard item={item} onClick={() => handleEdit(item)} />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="text-xs font-bold text-gray-700 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="text-xs font-bold text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { error: toggleError } = await supabase
                              .from('events_schedule_items')
                              .update({ is_active: !item.is_active })
                              .eq('id', item.id);
                            if (toggleError) throw toggleError;
                            invalidateScheduleQueries();
                            await refetch();
                          } catch (err) {
                            showToast('error', err instanceof Error ? err.message : 'Failed to toggle active');
                          }
                        }}
                        className={`text-xs font-bold rounded px-3 py-1.5 ${
                          item.is_active
                            ? 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                            : 'text-white bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {item.is_active ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Order</h3>
              {hasUnsavedOrder ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelOrder}
                    disabled={applyingOrder}
                    className="flex items-center gap-1 text-xs font-bold text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleApplyOrder()}
                    disabled={applyingOrder}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-[#ff4b86] rounded px-3 py-1.5 hover:bg-[#ff6a9a] disabled:opacity-50"
                  >
                    {applyingOrder ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Confirm Order
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Drag to reorder</p>
              )}
            </div>

            {orderItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No items to reorder</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <SortableRow key={item.id} item={item} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Live Preview</h3>
            <EventScheduleCard item={previewItem} />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? 'Edit Item' : 'Create Item'}</h3>
              {editingItem ? (
                <span className="text-xs text-gray-500">ID: {editingItem.id}</span>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color min-h-[90px]"
                  placeholder="Short description"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time Label</label>
                  <input
                    value={form.time_label}
                    onChange={(e) => setForm((p) => ({ ...p, time_label: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                    placeholder="10:00 AM - 4:00 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    list="event-categories"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Placeholder Icon</label>
                  <input
                    list="event-icons"
                    value={form.placeholder_icon}
                    onChange={(e) => setForm((p) => ({ ...p, placeholder_icon: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Coming Soon</p>
                    <p className="text-xs text-gray-500">Show badge on card</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_coming_soon}
                    onChange={(e) => setForm((p) => ({ ...p, is_coming_soon: e.target.checked }))}
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
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CTA Text</label>
                <input
                  value={form.button_text}
                  onChange={(e) => setForm((p) => ({ ...p, button_text: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  placeholder="Register"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CTA URL (optional)</label>
                <input
                  type="url"
                  value={form.button_url}
                  onChange={(e) => setForm((p) => ({ ...p, button_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-gray-500">If empty, button will appear disabled.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  />
                  <p className="mt-1 text-xs text-gray-500">Prefer drag ordering; this is advanced.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Image</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void handleUploadImage(file);
                        e.currentTarget.value = '';
                      }}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-200 file:text-gray-800 hover:file:bg-gray-300"
                    />
                  </div>
                      {form.image_url ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <a
                            href={form.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-primary hover:text-gray-900"
                          >
                            Open image
                          </a>
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, image_url: '', image_path: '', image_bucket: SCHEDULE_BUCKET_ID }))}
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
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => resetEditor()}
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
      </div>
    </AdminLayout>
  );
}
