import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { withTimeout } from '../../../utils/queryHelpers';
import {
  createInitialBannerFormData,
  getStageBanners,
  groupBanners,
  REQUEST_TIMEOUT_MS,
  TAB_RETURN_EVENT,
  toBannerFormData,
  UPLOAD_TIMEOUT_MS,
} from './bannerManagerHelpers';
import type { Banner, BannerManagerController } from './bannerManagerTypes';

type ShowToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;

export function useBannerManagerController(showToast: ShowToast): BannerManagerController {
  const queryClient = useQueryClient();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageBannersOrder, setStageBannersOrder] = useState<Banner[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [applyingOrder, setApplyingOrder] = useState(false);
  const [formData, setFormData] = useState(createInitialBannerFormData);

  const [uploadingTitle, setUploadingTitle] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await withTimeout(
        supabase.from('banners').select('*').order('banner_type', { ascending: true }).order('display_order', { ascending: true }),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      if (error) throw error;

      const nextBanners = data ?? [];
      setBanners(nextBanners);
      setStageBannersOrder(getStageBanners(nextBanners));
      setHasUnsavedChanges(false);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTabReturn = () => {
      if (hasUnsavedChanges || applyingOrder || saving || uploading) return;
      void fetchBanners();
    };

    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [applyingOrder, fetchBanners, hasUnsavedChanges, saving, uploading]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingBanner(null);
    setFormData(createInitialBannerFormData());
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingBanner(null);
    setFormData(createInitialBannerFormData());
    setShowForm(true);
  }, []);

  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showToast('error', 'Please upload an image or video file');
        return;
      }

      if (file.type.startsWith('video/') && file.size > 10 * 1024 * 1024) {
        showToast('error', 'Video size must be less than 10MB');
        return;
      }

      if (file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image size must be less than 5MB');
        return;
      }

      try {
        setUploading(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `banner-${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error } = await withTimeout(
          supabase.storage.from('banners').upload(filePath, file),
          UPLOAD_TIMEOUT_MS,
          'Upload gambar terlalu lama (timeout). Coba lagi saat koneksi lebih stabil.'
        );
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('banners').getPublicUrl(filePath);

        setFormData((current) => ({ ...current, image_url: publicUrl }));
        showToast('success', 'Media uploaded successfully');
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to upload media');
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    },
    [showToast]
  );

  const handleTitleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('error', 'Please upload an image file for the title');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image size must be less than 5MB');
        return;
      }

      try {
        setUploadingTitle(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `banner-title-${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error } = await withTimeout(
          supabase.storage.from('banners').upload(filePath, file),
          UPLOAD_TIMEOUT_MS,
          'Upload gambar terlalu lama (timeout). Coba lagi saat koneksi lebih stabil.'
        );
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('banners').getPublicUrl(filePath);

        setFormData((current) => ({ ...current, title_image_url: publicUrl }));
        showToast('success', 'Title image uploaded successfully');
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to upload title image');
      } finally {
        setUploadingTitle(false);
        event.target.value = '';
      }
    },
    [showToast]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formData.image_url.trim()) {
        showToast('error', 'Media is required');
        return;
      }

      try {
        setSaving(true);

        if (editingBanner) {
          const { error } = await withTimeout(
            supabase
              .from('banners')
              .update({
                title: formData.title,
                subtitle: formData.subtitle || null,
                image_url: formData.image_url,
                title_image_url: formData.title_image_url || null,
                link_url: formData.link_url || null,
                banner_type: formData.banner_type,
                display_order: formData.display_order,
                is_active: formData.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editingBanner.id),
            REQUEST_TIMEOUT_MS,
            'Request timeout. Please try again.'
          );
          if (error) throw error;
          showToast('success', 'Banner updated successfully');
        } else {
          const { error } = await withTimeout(
            supabase.from('banners').insert({
              title: formData.title,
              subtitle: formData.subtitle || null,
              image_url: formData.image_url,
              title_image_url: formData.title_image_url || null,
              link_url: formData.link_url || null,
              banner_type: formData.banner_type,
              display_order: formData.display_order,
              is_active: formData.is_active,
            }),
            REQUEST_TIMEOUT_MS,
            'Request timeout. Please try again.'
          );
          if (error) throw error;
          showToast('success', 'Banner created successfully');
        }

        await queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
        closeForm();
        await fetchBanners();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to save banner');
      } finally {
        setSaving(false);
      }
    },
    [closeForm, editingBanner, fetchBanners, formData, queryClient, showToast]
  );

  const handleEdit = useCallback((banner: Banner) => {
    setEditingBanner(banner);
    setFormData(toBannerFormData(banner));
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this banner?')) return;

      try {
        const { error } = await withTimeout(
          supabase.from('banners').delete().eq('id', id),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (error) throw error;

        showToast('success', 'Banner deleted successfully');
        await queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
        await fetchBanners();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to delete banner');
      }
    },
    [fetchBanners, queryClient, showToast]
  );

  const handleToggleActive = useCallback(
    async (banner: Banner) => {
      try {
        const { error } = await withTimeout(
          supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id),
          REQUEST_TIMEOUT_MS,
          'Request timeout. Please try again.'
        );
        if (error) throw error;

        showToast('success', `Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
        await queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
        await fetchBanners();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to update banner');
      }
    },
    [fetchBanners, queryClient, showToast]
  );

  const handleStageOrderChange = useCallback(
    (orderedIds: number[]) => {
      setStageBannersOrder((current) => {
        const byId = new Map(current.map((banner) => [banner.id, banner]));
        const nextOrder = orderedIds.map((id) => byId.get(id)).filter((banner): banner is Banner => Boolean(banner));
        if (nextOrder.length !== current.length) return current;
        setHasUnsavedChanges(true);
        return nextOrder;
      });
    },
    []
  );

  const handleApplyOrder = useCallback(async () => {
    try {
      setApplyingOrder(true);

      const updates = stageBannersOrder.map((banner, index) =>
        supabase.from('banners').update({ display_order: index }).eq('id', banner.id)
      );
      const results = await withTimeout(Promise.all(updates), REQUEST_TIMEOUT_MS, 'Request timeout. Please try again.');

      if (results.some((result) => result.error)) {
        throw new Error('Failed to update some banners');
      }

      showToast('success', 'Stage banner order updated successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
      setHasUnsavedChanges(false);
      await fetchBanners();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update banner order');
    } finally {
      setApplyingOrder(false);
    }
  }, [fetchBanners, queryClient, showToast, stageBannersOrder]);

  const handleCancelOrder = useCallback(() => {
    setStageBannersOrder(getStageBanners(banners));
    setHasUnsavedChanges(false);
  }, [banners]);

  const groupedBanners = useMemo(() => groupBanners(banners, stageBannersOrder), [banners, stageBannersOrder]);

  return {
    banners,
    loading,
    showForm,
    editingBanner,
    uploading,
    uploadingTitle,
    saving,
    formData,
    stageBannersOrder,
    hasUnsavedChanges,
    applyingOrder,
    groupedBanners,
    setFormData,
    openCreateForm,
    closeForm,
    handleImageUpload,
    handleTitleImageUpload,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleToggleActive,
    handleStageOrderChange,
    handleApplyOrder,
    handleCancelOrder,
  };
}
