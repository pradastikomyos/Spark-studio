import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { DEFAULT_GLAM_PAGE_SETTINGS, useGlamPageSettings } from '../../hooks/useGlamPageSettings';
import { slugify } from '../../utils/merchant';

function ImageField({
  label,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:flex-row">
        {value ? (
          <img src={value} alt={label} className="h-28 w-full rounded-xl border border-gray-200 bg-white object-contain p-2 md:w-40" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-gray-400 md:w-40">
            <span className="material-symbols-outlined">image</span>
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = '';
              }}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload image
            </button>
          </div>

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            placeholder="Or paste a direct image URL"
          />
        </div>
      </div>
    </div>
  );
}

export default function BeautyPosterManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useGlamPageSettings();

  const [saving, setSaving] = useState(false);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_title);
  const [heroDescription, setHeroDescription] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_description);
  const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_image_url);
  const [lookHeading, setLookHeading] = useState(DEFAULT_GLAM_PAGE_SETTINGS.look_heading);
  const [lookModelImageUrl, setLookModelImageUrl] = useState(DEFAULT_GLAM_PAGE_SETTINGS.look_model_image_url);
  const [productSectionTitle, setProductSectionTitle] = useState(DEFAULT_GLAM_PAGE_SETTINGS.product_section_title);
  const [productSearchPlaceholder, setProductSearchPlaceholder] = useState(DEFAULT_GLAM_PAGE_SETTINGS.product_search_placeholder);

  useEffect(() => {
    const next = settings ?? DEFAULT_GLAM_PAGE_SETTINGS;
    setHeroTitle(next.hero_title);
    setHeroDescription(next.hero_description);
    setHeroImageUrl(next.hero_image_url);
    setLookHeading(next.look_heading);
    setLookModelImageUrl(next.look_model_image_url);
    setProductSectionTitle(next.product_section_title);
    setProductSearchPlaceholder(next.product_search_placeholder);
  }, [settings]);

  const handleUploadImage = useCallback(
    async (file: File, onComplete: (url: string) => void, prefix: string) => {
      try {
        if (!file.type.startsWith('image/')) {
          showToast('error', 'Please upload an image file');
          return;
        }

        const maxSizeMb = 5;
        if (file.size > maxSizeMb * 1024 * 1024) {
          showToast('error', `Image size must be less than ${maxSizeMb}MB`);
          return;
        }

        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${prefix}-${slugify(file.name.replace(/\.[^.]+$/, '')) || 'glam-image'}-${Date.now()}.${ext}`;
        const filePath = `glam/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('beauty-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('beauty-images').getPublicUrl(filePath);

        onComplete(publicUrl);
        showToast('success', 'Image uploaded successfully');
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
      }
    },
    [showToast]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        hero_title: heroTitle,
        hero_description: heroDescription,
        hero_image_url: heroImageUrl,
        look_heading: lookHeading,
        look_model_image_url: lookModelImageUrl,
        product_section_title: productSectionTitle,
        product_search_placeholder: productSearchPlaceholder,
      });

      showToast('success', 'GLAM page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save GLAM page settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="glam-page"
        title="GLAM Page CMS"
        subtitle="Loading..."
        onLogout={signOut}
      >
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="glam-page"
      title="GLAM Page CMS"
      subtitle="Manage fixed-layout content for /glam"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Hero Section</h2>
            <p className="mt-1 text-sm text-gray-500">Main editorial image plus the script title and description.</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <ImageField
              label="Hero image"
              value={heroImageUrl}
              onChange={setHeroImageUrl}
              onUpload={(file) => void handleUploadImage(file, setHeroImageUrl, 'glam-hero')}
            />

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Hero title</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(event) => setHeroTitle(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Hero description</label>
                <textarea
                  value={heroDescription}
                  onChange={(event) => setHeroDescription(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Get The Look Section</h2>
            <p className="mt-1 text-sm text-gray-500">Fixed collage area with one editable heading and one model image.</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <ImageField
              label="Model image"
              value={lookModelImageUrl}
              onChange={setLookModelImageUrl}
              onUpload={(file) => void handleUploadImage(file, setLookModelImageUrl, 'glam-look')}
            />

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Section heading</label>
              <input
                type="text"
                value={lookHeading}
                onChange={(event) => setLookHeading(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Product Section</h2>
            <p className="mt-1 text-sm text-gray-500">This section uses live products from the store. Only the labels are editable here.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Section title</label>
              <input
                type="text"
                value={productSectionTitle}
                onChange={(event) => setProductSectionTitle(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Search placeholder</label>
              <input
                type="text"
                value={productSearchPlaceholder}
                onChange={(event) => setProductSearchPlaceholder(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving...' : 'Save GLAM page'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
