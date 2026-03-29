import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_CHARM_BAR_PAGE_SETTINGS,
  type CharmBarPageSettings,
  type CharmBarQuickLink,
  type CharmBarSectionFonts,
  type CharmBarStep,
  type CharmBarVideoCard,
  useCharmBarSettings,
} from '../../hooks/useCharmBarSettings';
import { slugify } from '../../utils/merchant';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';
import { useProducts, type Product } from '../../hooks/useProducts';

type AssetKind = 'image' | 'video';

function AssetField({
  label,
  value,
  kind,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  kind: AssetKind;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  const accept = kind === 'image' ? 'image/*' : 'video/*';

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:flex-row">
        {value ? (
          kind === 'image' ? (
            <img
              src={value}
              alt={label}
              className="h-28 w-full rounded-xl border border-gray-200 bg-white object-cover md:w-40"
            />
          ) : (
            <video
              src={value}
              controls
              muted
              className="h-28 w-full rounded-xl border border-gray-200 bg-black object-cover md:w-40"
            />
          )
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-gray-400 md:w-40">
            <span className="material-symbols-outlined">{kind === 'image' ? 'image' : 'movie'}</span>
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="relative">
            <input
              type="file"
              accept={accept}
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
              Upload {kind}
            </button>
          </div>

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            placeholder={`Or paste a direct ${kind} URL`}
          />
        </div>
      </div>
    </div>
  );
}

export default function CharmBarPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useCharmBarSettings();

  const [saving, setSaving] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.hero_image_url);
  const [quickLinks, setQuickLinks] = useState<CharmBarQuickLink[]>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.quick_links);
  const [customizeTitle, setCustomizeTitle] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.customize_title);
  const [steps, setSteps] = useState<CharmBarStep[]>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.steps);
  const [videoIntroText, setVideoIntroText] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.video_intro_text);
  const [videoCards, setVideoCards] = useState<CharmBarVideoCard[]>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.video_cards);
  const [howItWorksTitle, setHowItWorksTitle] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_title);
  const [howItWorksIntro, setHowItWorksIntro] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_intro);
  const [howItWorksSteps, setHowItWorksSteps] = useState<string[]>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_steps);
  const [howItWorksVideoUrl, setHowItWorksVideoUrl] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_video_url);
  const [howItWorksCtaLabel, setHowItWorksCtaLabel] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_cta_label);
  const [howItWorksCtaHref, setHowItWorksCtaHref] = useState(DEFAULT_CHARM_BAR_PAGE_SETTINGS.how_it_works_cta_href);
  const [sectionFonts, setSectionFonts] = useState<CharmBarSectionFonts>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.section_fonts);
  const [bestSellerCharms, setBestSellerCharms] = useState<number[]>(DEFAULT_CHARM_BAR_PAGE_SETTINGS.best_seller_charms);
  
  const { data: products = [] } = useProducts();
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Selected products to display as chips
  const selectedProducts = products.filter(p => bestSellerCharms.includes(p.id));
  
  // Available products to add (filtered by search, excluding already selected, showing up to 10)
  const availableProducts = products
    .filter(p => !bestSellerCharms.includes(p.id))
    .filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    .slice(0, 10);

  const toggleBestSeller = (productId: number) => {
    setBestSellerCharms(curr => 
      curr.includes(productId) 
        ? curr.filter(id => id !== productId)
        : [...curr, productId]
    );
  };

  useEffect(() => {
    const next = settings ?? DEFAULT_CHARM_BAR_PAGE_SETTINGS;
    setHeroImageUrl(next.hero_image_url);
    setQuickLinks(next.quick_links);
    setCustomizeTitle(next.customize_title);
    setSteps(next.steps);
    setVideoIntroText(next.video_intro_text);
    setVideoCards(next.video_cards);
    setHowItWorksTitle(next.how_it_works_title);
    setHowItWorksIntro(next.how_it_works_intro);
    setHowItWorksSteps(next.how_it_works_steps);
    setHowItWorksVideoUrl(next.how_it_works_video_url);
    setHowItWorksCtaLabel(next.how_it_works_cta_label);
    setHowItWorksCtaHref(next.how_it_works_cta_href);
    setSectionFonts(next.section_fonts);
    setBestSellerCharms(next.best_seller_charms);
  }, [settings]);

  const handleUploadAsset = useCallback(
    async (file: File, onComplete: (url: string) => void, prefix: string, kind: AssetKind) => {
      try {
        if (!file.type.startsWith(`${kind}/`)) {
          showToast('error', `Please upload a valid ${kind} file`);
          return;
        }

        const maxSizeMb = kind === 'image' ? 5 : 50;
        if (file.size > maxSizeMb * 1024 * 1024) {
          showToast('error', `${kind} size must be less than ${maxSizeMb}MB`);
          return;
        }

        const ext = file.name.split('.').pop() || (kind === 'image' ? 'png' : 'mp4');
        const baseName = slugify(file.name.replace(/\.[^.]+$/, '')) || `${kind}-asset`;
        const fileName = `${prefix}-${baseName}-${Date.now()}.${ext}`;
        const filePath = `cms/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('charm-bar-assets')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('charm-bar-assets').getPublicUrl(filePath);

        onComplete(publicUrl);
        showToast('success', `${kind === 'image' ? 'Image' : 'Video'} uploaded successfully`);
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : `Failed to upload ${kind}`);
      }
    },
    [showToast]
  );

  const handleSave = async () => {
    setSaving(true);

    const payload: Partial<CharmBarPageSettings> = {
      hero_image_url: heroImageUrl,
      quick_links: quickLinks,
      customize_title: customizeTitle,
      steps,
      video_intro_text: videoIntroText,
      video_cards: videoCards,
      how_it_works_title: howItWorksTitle,
      how_it_works_intro: howItWorksIntro,
      how_it_works_steps: howItWorksSteps.map((step) => step.trim()).filter(Boolean),
      how_it_works_video_url: howItWorksVideoUrl,
      how_it_works_cta_label: howItWorksCtaLabel,
      how_it_works_cta_href: howItWorksCtaHref,
      section_fonts: sectionFonts,
      best_seller_charms: bestSellerCharms,
    };

    try {
      await updateSettings(payload);
      showToast('success', 'Charm Bar page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save Charm Bar page settings');
    } finally {
      setSaving(false);
    }
  };

  const updateQuickLink = <K extends keyof CharmBarQuickLink>(index: number, field: K, value: CharmBarQuickLink[K]) => {
    setQuickLinks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const updateStep = (index: number, field: keyof CharmBarStep, value: string) => {
    setSteps((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const updateVideoCard = (index: number, field: keyof CharmBarVideoCard, value: string) => {
    setVideoCards((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const updateHowItWorksStep = (index: number, value: string) => {
    setHowItWorksSteps((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  if (isLoading && !settings) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="charm-bar-page"
        title="Charm Bar CMS"
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
      defaultActiveMenuId="charm-bar-page"
      title="Charm Bar CMS"
      subtitle="Manage editable content for /charm-bar"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Hero Section</h2>
            <p className="mt-1 text-sm text-gray-500">Single hero image shown at the top of the Charm Bar page.</p>
          </div>

          <div className="mt-6">
            <AssetField
              label="Hero image"
              value={heroImageUrl}
              kind="image"
              onChange={setHeroImageUrl}
              onUpload={(file) => void handleUploadAsset(file, setHeroImageUrl, 'charm-bar-hero', 'image')}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Links</h2>
              <p className="mt-1 text-sm text-gray-500">Cards under the hero image. You can reorder by editing the array manually here.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setQuickLinks((current) => [
                  ...current,
                  { title: 'NEW LINK', description: '', image_url: '', image_urls: [], href: '/shop' },
                ])
              }
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add link
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={sectionFonts.quick_links}
              onChange={(nextValue) => setSectionFonts((current) => ({ ...current, quick_links: nextValue }))}
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {quickLinks.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Quick Link #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setQuickLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateQuickLink(index, 'title', event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Description</label>
                    <textarea
                      value={item.description}
                      onChange={(event) => updateQuickLink(index, 'description', event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Link</label>
                    <input
                      type="text"
                      value={item.href}
                      onChange={(event) => updateQuickLink(index, 'href', event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Images (Card loops up to 3 images)</label>
                    <div className="flex flex-col gap-4">
                      {[0, 1, 2].map((imgIndex) => (
                        <AssetField
                          key={imgIndex}
                          label={`Image ${imgIndex + 1}`}
                          value={item.image_urls?.[imgIndex] || (imgIndex === 0 ? item.image_url : '') || ''}
                          kind="image"
                          onChange={(value) => {
                            const newUrls = [...(item.image_urls || [item.image_url])];
                            newUrls[imgIndex] = value;
                            updateQuickLink(index, 'image_urls', newUrls);
                            if (imgIndex === 0) updateQuickLink(index, 'image_url', value);
                          }}
                          onUpload={(file) =>
                            void handleUploadAsset(
                              file,
                              (url) => {
                                const newUrls = [...(item.image_urls || [item.image_url])];
                                newUrls[imgIndex] = url;
                                updateQuickLink(index, 'image_urls', newUrls as any);
                                if (imgIndex === 0) updateQuickLink(index, 'image_url', url as any);
                              },
                              `charm-bar-link-${index + 1}-img${imgIndex + 1}`,
                              'image'
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customize Section</h2>
              <p className="mt-1 text-sm text-gray-500">Main title plus the bracelet/charm/how-to cards.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSteps((current) => [
                  ...current,
                  { title: 'NEW STEP', body: '', image_url: '', cta_label: 'LEARN MORE', cta_href: '/shop' },
                ])
              }
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add step
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={sectionFonts.customize}
              onChange={(nextValue) => setSectionFonts((current) => ({ ...current, customize: nextValue }))}
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Section title</label>
            <input
              type="text"
              value={customizeTitle}
              onChange={(event) => setCustomizeTitle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Step #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Title</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(event) => updateStep(index, 'title', event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Body</label>
                    <textarea
                      value={step.body}
                      onChange={(event) => updateStep(index, 'body', event.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">CTA label</label>
                      <input
                        type="text"
                        value={step.cta_label}
                        onChange={(event) => updateStep(index, 'cta_label', event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">CTA link</label>
                      <input
                        type="text"
                        value={step.cta_href}
                        onChange={(event) => updateStep(index, 'cta_href', event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <AssetField
                    label="Step image"
                    value={step.image_url}
                    kind="image"
                    onChange={(value) => updateStep(index, 'image_url', value)}
                    onUpload={(file) =>
                      void handleUploadAsset(file, (url) => updateStep(index, 'image_url', url), `charm-bar-step-${index + 1}`, 'image')
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Video Gallery</h2>
              <p className="mt-1 text-sm text-gray-500">Autoplay cards shown before the “How it works” block.</p>
            </div>
            <button
              type="button"
              onClick={() => setVideoCards((current) => [...current, { title: 'NEW VIDEO', video_url: '' }])}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add video
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={sectionFonts.video_gallery}
              onChange={(nextValue) => setSectionFonts((current) => ({ ...current, video_gallery: nextValue }))}
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Intro label</label>
            <input
              type="text"
              value={videoIntroText}
              onChange={(event) => setVideoIntroText(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {videoCards.map((video, index) => (
              <div key={`${video.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Video #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setVideoCards((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Card label</label>
                    <input
                      type="text"
                      value={video.title}
                      onChange={(event) => updateVideoCard(index, 'title', event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <AssetField
                    label="Video file"
                    value={video.video_url}
                    kind="video"
                    onChange={(value) => updateVideoCard(index, 'video_url', value)}
                    onUpload={(file) =>
                      void handleUploadAsset(file, (url) => updateVideoCard(index, 'video_url', url), `charm-bar-video-${index + 1}`, 'video')
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Best Seller Charms</h2>
            <p className="mt-1 text-sm text-gray-500">Pick up to 10 charms to automatically display in the "Best Seller" subcategory tab on the Shop page.</p>
          </div>

          <div className="mt-6">
            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Search Product</label>
              <input
                type="text"
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
                placeholder="Search charm by name..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
              />
              
              {productSearchQuery && availableProducts.length > 0 && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden z-20">
                  {availableProducts.map((p: Product) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        toggleBestSeller(p.id);
                        setProductSearchQuery('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-none flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900 line-clamp-1">{p.name}</span>
                      <span className="material-symbols-outlined text-[16px] text-[#ff4b86]">add_circle</span>
                    </button>
                  ))}
                </div>
              )}
              {productSearchQuery && availableProducts.length === 0 && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-center text-sm text-gray-500">
                  No products found. (Already added or doesn't exist)
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">
                Selected Best Sellers ({bestSellerCharms.length}/10)
              </label>
              
              {selectedProducts.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500">
                  No products selected for Best Seller.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedProducts.map((p: Product) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm pr-4">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-300 text-xl">{p.placeholder || 'image'}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBestSeller(p.id)}
                        className="w-8 h-8 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">How It Works Section</h2>
                <p className="mt-1 text-sm text-gray-500">Editable title, description, numbered steps, video, and CTA.</p>
              </div>
              <div className="w-full max-w-xl">
                <CmsSectionFontFields
                  value={sectionFonts.how_it_works}
                  onChange={(nextValue) => setSectionFonts((current) => ({ ...current, how_it_works: nextValue }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Title</label>
                <input
                  type="text"
                  value={howItWorksTitle}
                  onChange={(event) => setHowItWorksTitle(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Intro</label>
                <textarea
                  value={howItWorksIntro}
                  onChange={(event) => setHowItWorksIntro(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Numbered steps</label>
                  <button
                    type="button"
                    onClick={() => setHowItWorksSteps((current) => [...current, 'New instruction'])}
                    className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-700 hover:bg-gray-50"
                  >
                    Add step
                  </button>
                </div>

                <div className="space-y-3">
                  {howItWorksSteps.map((step, index) => (
                    <div key={`${index + 1}-${step}`} className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-500">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={step}
                        onChange={(event) => updateHowItWorksStep(index, event.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setHowItWorksSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">CTA label</label>
                  <input
                    type="text"
                    value={howItWorksCtaLabel}
                    onChange={(event) => setHowItWorksCtaLabel(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">CTA link</label>
                  <input
                    type="text"
                    value={howItWorksCtaHref}
                    onChange={(event) => setHowItWorksCtaHref(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <AssetField
              label="How it works video"
              value={howItWorksVideoUrl}
              kind="video"
              onChange={setHowItWorksVideoUrl}
              onUpload={(file) => void handleUploadAsset(file, setHowItWorksVideoUrl, 'charm-bar-how-it-works', 'video')}
            />
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
            {saving ? 'Saving...' : 'Save Charm Bar page'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
