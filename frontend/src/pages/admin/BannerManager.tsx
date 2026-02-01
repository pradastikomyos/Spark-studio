import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useToast } from '../../components/Toast';

type BannerType = 'hero' | 'stage' | 'promo' | 'events' | 'fashion' | 'beauty';

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
  
  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    banner_type: 'hero',
    display_order: 0,
    is_active: true,
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('banner_type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

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

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

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
        const { error } = await supabase
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
          .eq('id', editingBanner.id);

        if (error) throw error;
        showToast('success', 'Banner updated successfully');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert({
            title: formData.title,
            subtitle: formData.subtitle || null,
            image_url: formData.image_url,
            link_url: formData.link_url || null,
            banner_type: formData.banner_type,
            display_order: formData.display_order,
            is_active: formData.is_active,
          });

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
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

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
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      
      showToast('success', `Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() });
      fetchBanners();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update banner');
    }
  };

  const groupedBanners = {
    hero: banners.filter(b => b.banner_type === 'hero'),
    stage: banners.filter(b => b.banner_type === 'stage'),
    promo: banners.filter(b => b.banner_type === 'promo'),
    events: banners.filter(b => b.banner_type === 'events'),
    fashion: banners.filter(b => b.banner_type === 'fashion'),
    beauty: banners.filter(b => b.banner_type === 'beauty'),
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="banner-manager"
      title="Banner Manager"
      subtitle="Manage hero, stage, and promo banners"
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
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neutral-800 transition-colors shadow-md"
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
          {(['hero', 'stage', 'promo', 'events', 'fashion', 'beauty'] as BannerType[]).map(type => (
            <section key={type} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">{type} Banners</h3>
              
              {groupedBanners[type].length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No {type} banners yet</p>
              ) : (
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
                            className={`flex-1 text-xs font-bold rounded px-3 py-1.5 ${
                              banner.is_active
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
                  <option value="fashion">Fashion (Hero Slider)</option>
                  <option value="beauty">Beauty (Hero Slider)</option>
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
                        {(formData.banner_type === 'events' || formData.banner_type === 'fashion' || formData.banner_type === 'beauty') && (
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
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-neutral-900 file:text-gray-900 hover:file:bg-neutral-800 file:cursor-pointer disabled:opacity-50"
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
                  className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
