import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useToast } from '../../components/Toast';
import { withTimeout } from '../../utils/queryHelpers';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type BannerType = 'hero' | 'stage' | 'promo' | 'events' | 'shop';

interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  banner_type: BannerType;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  banner_type: BannerType;
  display_order: number;
  is_active: boolean;
}

const REQUEST_TIMEOUT_MS = 60000;
const UPLOAD_TIMEOUT_MS = 120000;
const TAB_RETURN_EVENT = 'tab-returned-from-idle';

// Sortable Banner Card Component
interface SortableBannerCardProps {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onToggleActive: (banner: Banner) => void;
  onDelete: (id: number) => void;
}

function SortableBannerCard({ banner, onEdit, onToggleActive, onDelete }: SortableBannerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-2 ${isDragging ? 'border-[#ff4b86] shadow-lg' : 'border-gray-200'} overflow-hidden bg-white`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="bg-gray-50 border-b border-gray-200 px-4 py-2 cursor-grab active:cursor-grabbing flex items-center gap-2 hover:bg-gray-100 transition-colors"
      >
        <span className="material-symbols-outlined text-gray-600">drag_indicator</span>
        <span className="text-xs font-bold text-gray-600">Drag to reorder</span>
      </div>

      <div className="relative aspect-video bg-gray-100">
        <img
          src={banner.image_url}
          alt={banner.title}
          className="w-full h-full object-cover"
        />
        {!banner.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm">INACTIVE</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 truncate">{banner.title}</h4>
        {banner.subtitle && (
          <p className="text-sm text-gray-600 truncate mt-1">{banner.subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onEdit(banner)}
            className="flex-1 text-xs font-bold text-neutral-900 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleActive(banner)}
            className={`flex-1 text-xs font-bold rounded px-3 py-1.5 ${banner.is_active
              ? 'text-gray-600 border border-gray-300 hover:bg-gray-50'
              : 'text-white bg-green-600 hover:bg-green-700'
              }`}
          >
            {banner.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(banner.id)}
            className="text-xs font-bold text-red-600 border border-red-300 rounded px-3 py-1.5 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const BannerManager = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drag-and-drop state for Stage Banners
  const [stageBannersOrder, setStageBannersOrder] = useState<Banner[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [applyingOrder, setApplyingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    banner_type: 'hero',
    display_order: 0,
    is_active: true,
  });

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await withTimeout(
        supabase.from('banners').select('*').order('banner_type', { ascending: true }).order('display_order', { ascending: true }),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      if (error) throw error;
      setBanners(data || []);

      // Initialize stage banners order
      const stageBanners = (data || []).filter(b => b.banner_type === 'stage');
      setStageBannersOrder(stageBanners);
      setHasUnsavedChanges(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = () => {
      if (hasUnsavedChanges || applyingOrder || saving || uploading) return;
      fetchBanners();
    };
    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [fetchBanners, hasUnsavedChanges, applyingOrder, saving, uploading]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await withTimeout(
        supabase.storage.from('banners').upload(filePath, file),
        UPLOAD_TIMEOUT_MS,
        'Upload gambar terlalu lama (timeout). Coba lagi saat koneksi lebih stabil.'
      );

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      showToast('success', 'Image uploaded successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }

    if (!formData.image_url.trim()) {
      showToast('error', 'Image is required');
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

      // Invalidate banners cache
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() });

      // Reset form
      setShowForm(false);
      setEditingBanner(null);
      setFormData({
        title: '',
        subtitle: '',
        image_url: '',
        link_url: '',
        banner_type: 'hero',
        display_order: 0,
        is_active: true,
      });

      fetchBanners();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      banner_type: banner.banner_type,
      display_order: banner.display_order,
      is_active: banner.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await withTimeout(
        supabase.from('banners').delete().eq('id', id),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      if (error) throw error;

      showToast('success', 'Banner deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
      fetchBanners();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await withTimeout(
        supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      if (error) throw error;

      showToast('success', `Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
      fetchBanners();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update banner');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStageBannersOrder((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newOrder;
      });
    }
  };

  const handleApplyOrder = async () => {
    try {
      setApplyingOrder(true);

      // Update display_order for each banner
      const updates = stageBannersOrder.map((banner, index) =>
        supabase
          .from('banners')
          .update({ display_order: index })
          .eq('id', banner.id)
      );

      const results = await withTimeout(
        Promise.all(updates),
        REQUEST_TIMEOUT_MS,
        'Request timeout. Please try again.'
      );

      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to update some banners');
      }

      showToast('success', 'Stage banner order updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
      setHasUnsavedChanges(false);
      fetchBanners();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update banner order');
    } finally {
      setApplyingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    const stageBanners = banners.filter(b => b.banner_type === 'stage');
    setStageBannersOrder(stageBanners);
    setHasUnsavedChanges(false);
  };



  const groupedBanners = {
    hero: banners.filter(b => b.banner_type === 'hero'),
    stage: stageBannersOrder, // Use the draggable order
    promo: banners.filter(b => b.banner_type === 'promo'),
    events: banners.filter(b => b.banner_type === 'events'),
    shop: banners.filter(b => b.banner_type === 'shop'),
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="banner-manager"
      title="Banner Manager"
      subtitle="Manage hero, stage, shop, and event banners"
      headerActions={
        <button
          onClick={() => {
            setEditingBanner(null);
            setFormData({
              title: '',
              subtitle: '',
              image_url: '',
              link_url: '',
              banner_type: 'hero',
              display_order: 0,
              is_active: true,
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Banner
        </button>
      }
      onLogout={signOut}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {(['hero', 'stage', 'promo', 'events', 'shop'] as BannerType[]).map(type => (
            <section key={type} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 capitalize">{type} Banners</h3>

                {/* Show confirm/cancel buttons for Stage Banners when there are unsaved changes */}
                {type === 'stage' && hasUnsavedChanges && (
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
                      onClick={handleApplyOrder}
                      disabled={applyingOrder}
                      className="flex items-center gap-1 text-xs font-bold text-white bg-[#ff4b86] rounded px-3 py-1.5 hover:bg-[#ff6a9a] disabled:opacity-50"
                    >
                      {applyingOrder ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
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
                )}
              </div>

              {groupedBanners[type].length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No {type} banners yet</p>
              ) : type === 'stage' ? (
                // Draggable Stage Banners
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={groupedBanners[type].map(b => b.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedBanners[type].map(banner => (
                        <SortableBannerCard
                          key={banner.id}
                          banner={banner}
                          onEdit={handleEdit}
                          onToggleActive={handleToggleActive}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                // Regular grid for other banner types
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedBanners[type].map(banner => (
                    <div key={banner.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                        {!banner.is_active && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">INACTIVE</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 truncate">{banner.title}</h4>
                        {banner.subtitle && (
                          <p className="text-sm text-gray-600 truncate mt-1">{banner.subtitle}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="flex-1 text-xs font-bold text-neutral-900 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(banner)}
                            className={`flex-1 text-xs font-bold rounded px-3 py-1.5 ${banner.is_active
                              ? 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                              : 'text-gray-900 bg-green-600 hover:bg-green-700'
                              }`}
                          >
                            {banner.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(banner.id)}
                            className="text-xs font-bold text-red-600 border border-red-300 rounded px-3 py-1.5 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="Enter banner title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="Enter banner subtitle (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Banner Type *</label>
                <select
                  value={formData.banner_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, banner_type: e.target.value as BannerType }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                >
                  <option value="hero">Hero (Main Slider)</option>
                  <option value="stage">Stage (Carousel)</option>
                  <option value="promo">Promo</option>
                  <option value="events">Events (Hero Slider)</option>
                  <option value="shop">Shop (Hero Slider)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Image *</label>

                {/* Image Guidelines */}
                <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-[20px] mt-0.5">info</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-900 mb-1">Recommended Image Specifications:</p>
                      <ul className="text-xs text-blue-800 space-y-0.5">
                        {formData.banner_type === 'hero' && (
                          <>
                            <li>• Resolution: <span className="font-semibold">1920 x 1080px</span> (16:9 aspect ratio)</li>
                            <li>• Best for: Full-width hero sliders on OnStage page</li>
                          </>
                        )}
                        {formData.banner_type === 'stage' && (
                          <>
                            <li>• Resolution: <span className="font-semibold">800 x 600px</span> (4:3 aspect ratio)</li>
                            <li>• Best for: Stage carousel cards</li>
                          </>
                        )}
                        {(formData.banner_type === 'events' || formData.banner_type === 'shop') && (
                          <>
                            <li>• Resolution: <span className="font-semibold">1920 x 800px</span> (21:9 aspect ratio)</li>
                            <li>• Best for: Wide hero banners with text overlay</li>
                          </>
                        )}
                        {formData.banner_type === 'promo' && (
                          <>
                            <li>• Resolution: <span className="font-semibold">1200 x 600px</span> (2:1 aspect ratio)</li>
                            <li>• Best for: Promotional banners</li>
                          </>
                        )}
                        <li>• Format: JPG, PNG, or WebP</li>
                        <li>• Max file size: <span className="font-semibold">2MB</span></li>
                        <li>• Tip: Use high-quality images for best display on all devices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {formData.image_url && (
                  <div className="mb-3 rounded-lg border border-gray-200 overflow-hidden">
                    <img src={formData.image_url} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">✓ Image uploaded successfully</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#ff4b86] file:text-white hover:file:bg-[#ff6a9a] file:cursor-pointer disabled:opacity-50"
                />
                {uploading && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900"></div>
                    <p className="text-sm text-gray-600">Uploading image...</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Link URL</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  placeholder="https://example.com (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
                  Active (visible on website)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading || !formData.image_url}
                  className="flex-1 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default BannerManager;
