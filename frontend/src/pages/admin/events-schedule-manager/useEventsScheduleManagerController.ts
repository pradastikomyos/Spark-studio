import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { withTimeout } from '../../../utils/queryHelpers';
import { useEventSchedule, type EventScheduleItem } from '../../../hooks/useEventSchedule';
import {
  buildFormState,
  REQUEST_TIMEOUT_MS,
  SCHEDULE_BUCKET_ID,
  toPreviewItem,
  UPLOAD_TIMEOUT_MS,
} from './eventsScheduleManagerHelpers';
import type { EventsScheduleManagerController } from './eventsScheduleManagerTypes';

type ShowToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;

export function useEventsScheduleManagerController(showToast: ShowToast): EventsScheduleManagerController {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, error, refetch } = useEventSchedule({ includeInactive: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);
  const [form, setForm] = useState(() => buildFormState(null));
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

  const invalidateScheduleQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventSchedule('admin') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventSchedule('public') });
  }, [queryClient]);

  const resetEditor = useCallback(() => {
    setEditingItem(null);
    setForm(buildFormState(null));
  }, []);

  const handleEdit = useCallback((item: EventScheduleItem) => {
    setEditingItem(item);
    setForm(buildFormState(item));
  }, []);

  const deleteImageIfPresent = useCallback(async (bucketId: string | null | undefined, path: string | null | undefined) => {
    const safeBucket = bucketId || SCHEDULE_BUCKET_ID;
    const safePath = path || '';
    if (!safePath.trim()) return;

    const { error: removeError } = await supabase.storage.from(safeBucket).remove([safePath]);
    if (removeError) throw removeError;
  }, []);

  const handleUploadImageFile = useCallback(
    async (file: File) => {
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

        const {
          data: { publicUrl },
        } = supabase.storage.from(SCHEDULE_BUCKET_ID).getPublicUrl(filePath);
        setForm((current) => ({ ...current, image_url: publicUrl, image_path: filePath, image_bucket: SCHEDULE_BUCKET_ID }));
        showToast('success', 'Image uploaded');
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [showToast]
  );

  const handleSave = useCallback(async () => {
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
        if (data) setEditingItem(data as EventScheduleItem);
        showToast('success', 'Schedule item created');
      }

      invalidateScheduleQueries();
      await refetch();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save schedule item');
    } finally {
      setSaving(false);
    }
  }, [deleteImageIfPresent, editingItem, form, invalidateScheduleQueries, refetch, showToast]);

  const handleDelete = useCallback(
    async (item: EventScheduleItem) => {
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

        if (editingItem?.id === item.id) resetEditor();
        invalidateScheduleQueries();
        await refetch();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to delete schedule item');
      } finally {
        setSaving(false);
      }
    },
    [deleteImageIfPresent, editingItem?.id, invalidateScheduleQueries, refetch, resetEditor, showToast]
  );

  const handleToggleActive = useCallback(
    async (item: EventScheduleItem) => {
      try {
        const { error: toggleError } = await supabase
          .from('events_schedule_items')
          .update({ is_active: !item.is_active })
          .eq('id', item.id);
        if (toggleError) throw toggleError;
        invalidateScheduleQueries();
        await refetch();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to toggle active');
      }
    },
    [invalidateScheduleQueries, refetch, showToast]
  );

  const handleOrderChange = useCallback((orderedIds: number[]) => {
    setOrderItems((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      const nextOrder = orderedIds.map((id) => byId.get(id)).filter((item): item is EventScheduleItem => Boolean(item));
      if (nextOrder.length !== current.length) return current;
      return nextOrder;
    });
    setHasUnsavedOrder(true);
  }, []);

  const handleApplyOrder = useCallback(async () => {
    if (!hasUnsavedOrder) return;
    try {
      setApplyingOrder(true);
      const updates = orderItems.map((item, index) =>
        supabase.from('events_schedule_items').update({ sort_order: index }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const hadError = results.some((result) => result.error);
      if (hadError) {
        const firstError = results.find((result) => result.error)?.error;
        throw new Error(firstError?.message || 'Failed to update order');
      }

      showToast('success', 'Order updated');
      setHasUnsavedOrder(false);
      invalidateScheduleQueries();
      await refetch();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setApplyingOrder(false);
    }
  }, [hasUnsavedOrder, invalidateScheduleQueries, orderItems, refetch, showToast]);

  const handleCancelOrder = useCallback(() => {
    setOrderItems(items.slice());
    setHasUnsavedOrder(false);
  }, [items]);

  const previewItem = useMemo(() => toPreviewItem(form, editingItem?.id ?? -1), [editingItem?.id, form]);

  return {
    items,
    isLoading,
    error,
    searchQuery,
    editingItem,
    form,
    saving,
    uploading,
    orderItems,
    hasUnsavedOrder,
    applyingOrder,
    filteredItems,
    previewItem,
    setSearchQuery,
    setForm,
    resetEditor,
    handleEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
    handleUploadImageFile,
    handleOrderChange,
    handleApplyOrder,
    handleCancelOrder,
  };
}
