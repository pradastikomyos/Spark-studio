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

const formatScheduleError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const validateScheduleForm = (form: ReturnType<typeof buildFormState>) => {
  if (!form.title.trim()) return 'Title is required';
  if (!form.description.trim()) return 'Description is required';
  if (!form.event_date.trim()) return 'Event date is required';
  if (!form.time_label.trim()) return 'Time label is required';
  if (!form.category.trim()) return 'Category is required';
  return null;
};

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

  const refreshScheduleData = useCallback(async () => {
    invalidateScheduleQueries();
    await refetch();
  }, [invalidateScheduleQueries, refetch]);

  const runScheduleTask = useCallback(
    async <T,>(task: () => Promise<T>, options: {
      errorMessage: string;
      successMessage?: string;
      refresh?: boolean;
      onSuccess?: (result: T) => Promise<void> | void;
      onFinally?: () => void;
    }) => {
      try {
        const result = await task();
        if (options.successMessage) {
          showToast('success', options.successMessage);
        }
        await options.onSuccess?.(result);
        if (options.refresh !== false) {
          await refreshScheduleData();
        }
        return result;
      } catch (error) {
        showToast('error', formatScheduleError(error, options.errorMessage));
        return null;
      } finally {
        options.onFinally?.();
      }
    },
    [refreshScheduleData, showToast]
  );

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
    const validationError = validateScheduleForm(form);
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setSaving(true);
    const prevBucket = editingItem?.image_bucket ?? SCHEDULE_BUCKET_ID;
    const prevPath = editingItem?.image_path ?? '';
    const nextBucket = form.image_bucket || SCHEDULE_BUCKET_ID;
    const nextPath = form.image_path || '';

    await runScheduleTask(
      async () => {
        if (editingItem) {
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
          return null;
        }

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
        return data as EventScheduleItem | null;
      },
      {
        successMessage: editingItem ? 'Schedule item updated' : 'Schedule item created',
        errorMessage: 'Failed to save schedule item',
        onSuccess: async (savedItem) => {
          if (!editingItem && savedItem) {
            setEditingItem(savedItem);
          }
          if (editingItem && prevPath && (prevBucket !== nextBucket || prevPath !== nextPath)) {
            try {
              await deleteImageIfPresent(prevBucket, prevPath);
            } catch (cleanupError) {
              showToast('error', formatScheduleError(cleanupError, 'Failed to cleanup old image'));
            }
          }
        },
        onFinally: () => setSaving(false),
      }
    );
  }, [deleteImageIfPresent, editingItem, form, runScheduleTask, showToast]);

  const handleDelete = useCallback(
    async (item: EventScheduleItem) => {
      if (!confirm(`Delete "${item.title}"?`)) return;
      setSaving(true);
      await runScheduleTask(
        async () => {
          const { error: deleteError } = await withTimeout(
            supabase.from('events_schedule_items').delete().eq('id', item.id),
            REQUEST_TIMEOUT_MS,
            'Request timeout. Please try again.'
          );
          if (deleteError) throw deleteError;
          return null;
        },
        {
          successMessage: 'Schedule item deleted',
          errorMessage: 'Failed to delete schedule item',
          onSuccess: async () => {
            if (item.image_path) {
              try {
                await deleteImageIfPresent(item.image_bucket, item.image_path);
              } catch (cleanupError) {
                showToast('error', formatScheduleError(cleanupError, 'Failed to cleanup image'));
              }
            }

            if (editingItem?.id === item.id) {
              resetEditor();
            }
          },
          onFinally: () => setSaving(false),
        }
      );
    },
    [deleteImageIfPresent, editingItem?.id, resetEditor, runScheduleTask, showToast]
  );

  const handleToggleActive = useCallback(
    async (item: EventScheduleItem) => {
      await runScheduleTask(
        async () => {
          const { error: toggleError } = await supabase
            .from('events_schedule_items')
            .update({ is_active: !item.is_active })
            .eq('id', item.id);
          if (toggleError) throw toggleError;
          return null;
        },
        {
          errorMessage: 'Failed to toggle active',
        }
      );
    },
    [runScheduleTask]
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
    setApplyingOrder(true);
    await runScheduleTask(
      async () => {
        const updates = orderItems.map((item, index) =>
          supabase.from('events_schedule_items').update({ sort_order: index }).eq('id', item.id)
        );
        const results = await Promise.all(updates);
        const hadError = results.some((result) => result.error);
        if (hadError) {
          const firstError = results.find((result) => result.error)?.error;
          throw new Error(firstError?.message || 'Failed to update order');
        }
        return null;
      },
      {
        successMessage: 'Order updated',
        errorMessage: 'Failed to update order',
        onSuccess: async () => {
          setHasUnsavedOrder(false);
        },
        onFinally: () => setApplyingOrder(false),
      }
    );
  }, [hasUnsavedOrder, orderItems, runScheduleTask]);

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
