import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { DEFAULT_GLAM_PAGE_SETTINGS, type GlamStarLink, useGlamPageSettings } from '../../hooks/useGlamPageSettings';
import { useProductPickerOptions, type ProductPickerOption } from '../../hooks/useProducts';
import { slugify } from '../../utils/merchant';
import { formatCurrency } from '../../utils/formatters';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';
import type { GlamSectionFonts } from '../../hooks/useGlamPageSettings';

const STAR_SLOT_LABELS: Record<string, string> = {
  'pink-rush': 'Pink Rush star',
  'silver-blink': 'Silver Blink star',
  bronze: 'Bronze star',
  'aura-pop': 'Aura Pop mini star',
};

function StarProductPicker({
  title,
  selectedProductId,
  selectedProduct,
  selectedImageUrl,
  products,
  onSelect,
  onChangeImage,
  onUploadImage,
}: {
  title: string;
  selectedProductId: number | null;
  selectedProduct: ProductPickerOption | null;
  selectedImageUrl: string | null;
  products: ProductPickerOption[];
  onSelect: (productId: number | null) => void;
  onChangeImage: (value: string) => void;
  onUploadImage: (file: File) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!selectedProduct) return;
    setSearchTerm(selectedProduct.name);
  }, [selectedProductId, selectedProduct]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
            {selectedProduct ? 'Linked to a shop product' : 'No linked product yet'}
          </p>
        </div>
        {selectedProduct ? (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearchTerm('');
            }}
            className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 hover:bg-white"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="relative mt-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search product by name..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
        />

        {isOpen ? (
          <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
            {filteredProducts.slice(0, 12).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onSelect(product.id);
                  setSearchTerm(product.name);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg bg-gray-100 object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-[#ff4b86]">{formatCurrency(product.price)}</p>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No matching product found.</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Star image</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start">
          {selectedImageUrl ? (
            <img
              src={selectedImageUrl}
              alt={`${title} preview`}
              className="h-20 w-20 rounded-xl border border-gray-200 bg-white object-contain p-2"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-300">
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
                  if (file) onUploadImage(file);
                  event.target.value = '';
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload custom star image
              </button>
            </div>

            <input
              type="text"
              value={selectedImageUrl ?? ''}
              onChange={(event) => onChangeImage(event.target.value)}
              placeholder="Or paste a custom image URL"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const { data: products = [], isLoading: productsLoading } = useProductPickerOptions();

  const [saving, setSaving] = useState(false);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_title);
  const [heroDescription, setHeroDescription] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_description);
  const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_GLAM_PAGE_SETTINGS.hero_image_url);
  const [lookHeading, setLookHeading] = useState(DEFAULT_GLAM_PAGE_SETTINGS.look_heading);
  const [lookModelImageUrl, setLookModelImageUrl] = useState(DEFAULT_GLAM_PAGE_SETTINGS.look_model_image_url);
  const [lookStarLinks, setLookStarLinks] = useState<GlamStarLink[]>(DEFAULT_GLAM_PAGE_SETTINGS.look_star_links);
  const [productSectionTitle, setProductSectionTitle] = useState(DEFAULT_GLAM_PAGE_SETTINGS.product_section_title);
  const [productSearchPlaceholder, setProductSearchPlaceholder] = useState(DEFAULT_GLAM_PAGE_SETTINGS.product_search_placeholder);
  const [sectionFonts, setSectionFonts] = useState<GlamSectionFonts>(DEFAULT_GLAM_PAGE_SETTINGS.section_fonts);

  useEffect(() => {
    const next = settings ?? DEFAULT_GLAM_PAGE_SETTINGS;
    setHeroTitle(next.hero_title);
    setHeroDescription(next.hero_description);
    setHeroImageUrl(next.hero_image_url);
    setLookHeading(next.look_heading);
    setLookModelImageUrl(next.look_model_image_url);
    setLookStarLinks(next.look_star_links);
    setProductSectionTitle(next.product_section_title);
    setProductSearchPlaceholder(next.product_search_placeholder);
    setSectionFonts(next.section_fonts);
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
        look_star_links: lookStarLinks,
        product_section_title: productSectionTitle,
        product_search_placeholder: productSearchPlaceholder,
        section_fonts: sectionFonts,
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

  const updateStarProduct = (slot: string, productId: number | null) => {
    setLookStarLinks((current) =>
      current.map((link) => (link.slot === slot ? { ...link, product_id: productId } : link))
    );
  };

  const updateStarImage = (slot: string, imageUrl: string | null) => {
    setLookStarLinks((current) =>
      current.map((link) => (link.slot === slot ? { ...link, image_url: imageUrl } : link))
    );
  };

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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Hero Section</h2>
                <p className="mt-1 text-sm text-gray-500">Main editorial image plus the script title and description.</p>
              </div>
              <div className="w-full max-w-xl">
                <CmsSectionFontFields
                  value={sectionFonts.hero}
                  onChange={(nextValue) => setSectionFonts((current) => ({ ...current, hero: nextValue }))}
                />
              </div>
            </div>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Get The Look Section</h2>
                <p className="mt-1 text-sm text-gray-500">Fixed collage area with one editable heading, one model image, and linked star hotspots.</p>
              </div>
              <div className="w-full max-w-xl">
                <CmsSectionFontFields
                  value={sectionFonts.look}
                  onChange={(nextValue) => setSectionFonts((current) => ({ ...current, look: nextValue }))}
                />
              </div>
            </div>
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

          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Clickable Star Links</h3>
              <p className="mt-1 text-sm text-gray-500">
                Each decorative star on the GLAM page can open one product from the shop.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {lookStarLinks.map((link) => (
                <StarProductPicker
                  key={link.slot}
                  title={STAR_SLOT_LABELS[link.slot] ?? link.slot}
                  selectedProductId={link.product_id}
                  selectedProduct={products.find((product) => product.id === link.product_id) ?? null}
                  selectedImageUrl={link.image_url}
                  products={products}
                  onSelect={(productId) => updateStarProduct(link.slot, productId)}
                  onChangeImage={(value) => updateStarImage(link.slot, value.trim() ? value : null)}
                  onUploadImage={(file) =>
                    void handleUploadImage(file, (url) => updateStarImage(link.slot, url), `glam-star-${link.slot}`)
                  }
                />
              ))}
            </div>

            {productsLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading products for star linking...</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Product Section</h2>
                <p className="mt-1 text-sm text-gray-500">This section uses live products from the store. Only the labels are editable here.</p>
              </div>
              <div className="w-full max-w-xl">
                <CmsSectionFontFields
                  value={sectionFonts.products}
                  onChange={(nextValue) => setSectionFonts((current) => ({ ...current, products: nextValue }))}
                />
              </div>
            </div>
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
