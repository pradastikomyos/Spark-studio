import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import {
  DEFAULT_CHARM_BAR_PAGE_SETTINGS,
  type CharmBarPageSettings,
  type CharmBarQuickLink,
  type CharmBarStep,
  type CharmBarVideoCard,
  useCharmBarSettings,
} from '../../hooks/useCharmBarSettings';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';
import CmsAssetField from '../../components/admin/CmsAssetField';
import { useProductPickerOptions, type ProductPickerOption } from '../../hooks/useProducts';
import { uploadCmsAsset } from '../../lib/cmsAssetUpload';

type AssetKind = 'image' | 'video';

type CharmBarPageDraft = Omit<CharmBarPageSettings, 'id'>;

function createCharmBarDraft(source?: CharmBarPageSettings | null): CharmBarPageDraft {
  const next = source ?? DEFAULT_CHARM_BAR_PAGE_SETTINGS;

  return {
    hero_image_url: next.hero_image_url || '',
    quick_links: next.quick_links || [],
    customize_title: next.customize_title || '',
    steps: next.steps || [],
    video_intro_text: next.video_intro_text || '',
    video_cards: next.video_cards || [],
    how_it_works_title: next.how_it_works_title || '',
    how_it_works_intro: next.how_it_works_intro || '',
    how_it_works_steps: next.how_it_works_steps || [],
    how_it_works_video_url: next.how_it_works_video_url || '',
    how_it_works_cta_label: next.how_it_works_cta_label || '',
    how_it_works_cta_href: next.how_it_works_cta_href || '',
    section_fonts: next.section_fonts,
    best_seller_charms: next.best_seller_charms || [],
  };
}

export default function CharmBarPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useCharmBarSettings();

  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CharmBarPageDraft>(() => createCharmBarDraft(DEFAULT_CHARM_BAR_PAGE_SETTINGS));
  const { data: products = [] } = useProductPickerOptions();
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const updateDraft = useCallback((updates: Partial<CharmBarPageDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  }, []);

  // Selected products to display as chips
  const selectedProducts = products.filter((product) => draft.best_seller_charms.includes(product.id));
  
  // Available products to add (filtered by search, excluding already selected, showing up to 10)
  const availableProducts = products
    .filter((product) => !draft.best_seller_charms.includes(product.id))
    .filter((product) => product.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    .slice(0, 10);

  const toggleBestSeller = (productId: number) => {
    setDraft((current) => ({
      ...current,
      best_seller_charms: current.best_seller_charms.includes(productId)
        ? current.best_seller_charms.filter((id) => id !== productId)
        : [...current.best_seller_charms, productId],
    }));
  };

  useEffect(() => {
    setDraft(createCharmBarDraft(settings));
  }, [settings]);

  const handleUploadAsset = useCallback(
    async (file: File, onComplete: (url: string) => void, prefix: string, kind: AssetKind) => {
      try {
        await uploadCmsAsset({
          file,
          bucket: 'charm-bar-assets',
          prefix,
          kind,
          folder: 'cms',
          showToast,
          onUploaded: onComplete,
        });
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : `Failed to upload ${kind}`);
      }
    },
    [showToast]
  );

  const handleSave = async () => {
    setSaving(true);

    const payload: Partial<CharmBarPageSettings> = {
      hero_image_url: draft.hero_image_url,
      quick_links: draft.quick_links,
      customize_title: draft.customize_title,
      steps: draft.steps,
      video_intro_text: draft.video_intro_text,
      video_cards: draft.video_cards,
      how_it_works_title: draft.how_it_works_title,
      how_it_works_intro: draft.how_it_works_intro,
      how_it_works_steps: draft.how_it_works_steps.map((step) => step.trim()).filter(Boolean),
      how_it_works_video_url: draft.how_it_works_video_url,
      how_it_works_cta_label: draft.how_it_works_cta_label,
      how_it_works_cta_href: draft.how_it_works_cta_href,
      section_fonts: draft.section_fonts,
      best_seller_charms: draft.best_seller_charms,
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
    updateDraft({
      quick_links: draft.quick_links.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    });
  };

  const updateStep = (index: number, field: keyof CharmBarStep, value: string) => {
    updateDraft({
      steps: draft.steps.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    });
  };

  const updateVideoCard = (index: number, field: keyof CharmBarVideoCard, value: string) => {
    updateDraft({
      video_cards: draft.video_cards.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    });
  };

  const updateHowItWorksStep = (index: number, value: string) => {
    updateDraft({
      how_it_works_steps: draft.how_it_works_steps.map((item, itemIndex) => (itemIndex === index ? value : item)),
    });
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
            <CmsAssetField
              label="Hero image"
              value={draft.hero_image_url}
              kind="image"
              onChange={(value) => updateDraft({ hero_image_url: value })}
              onUpload={(file) => void handleUploadAsset(file, (url) => updateDraft({ hero_image_url: url }), 'charm-bar-hero', 'image')}
              previewClassName="h-28 w-full rounded-xl border border-gray-200 bg-white object-cover md:w-40"
              uploadLabel="Upload image"
              placeholder="Or paste a direct image URL"
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
                updateDraft({
                  quick_links: [
                    ...draft.quick_links,
                  { title: 'NEW LINK', description: '', image_url: '', image_urls: [], href: '/shop' },
                  ],
                })
              }
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add link
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={draft.section_fonts.quick_links}
              onChange={(nextValue) =>
                updateDraft({ section_fonts: { ...draft.section_fonts, quick_links: nextValue } })
              }
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {draft.quick_links.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Quick Link #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft({ quick_links: draft.quick_links.filter((_, itemIndex) => itemIndex !== index) })
                    }
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
                        <CmsAssetField
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
                                updateQuickLink(index, 'image_urls', newUrls);
                                if (imgIndex === 0) updateQuickLink(index, 'image_url', url);
                              },
                              `charm-bar-link-${index + 1}-img${imgIndex + 1}`,
                              'image'
                            )
                          }
                          previewClassName="h-28 w-full rounded-xl border border-gray-200 bg-white object-cover md:w-40"
                          uploadLabel="Upload image"
                          placeholder="Or paste a direct image URL"
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
                updateDraft({
                  steps: [
                    ...draft.steps,
                  { title: 'NEW STEP', body: '', image_url: '', cta_label: 'LEARN MORE', cta_href: '/shop' },
                  ],
                })
              }
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add step
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={draft.section_fonts.customize}
              onChange={(nextValue) =>
                updateDraft({ section_fonts: { ...draft.section_fonts, customize: nextValue } })
              }
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Section title</label>
            <input
              type="text"
              value={draft.customize_title}
              onChange={(event) => updateDraft({ customize_title: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {draft.steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Step #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() => updateDraft({ steps: draft.steps.filter((_, itemIndex) => itemIndex !== index) })}
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

                  <CmsAssetField
                    label="Step image"
                    value={step.image_url}
                    kind="image"
                    onChange={(value) => updateStep(index, 'image_url', value)}
                    onUpload={(file) =>
                      void handleUploadAsset(file, (url) => updateStep(index, 'image_url', url), `charm-bar-step-${index + 1}`, 'image')
                    }
                    previewClassName="h-28 w-full rounded-xl border border-gray-200 bg-white object-cover md:w-40"
                    uploadLabel="Upload image"
                    placeholder="Or paste a direct image URL"
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
              onClick={() =>
                updateDraft({ video_cards: [...draft.video_cards, { title: 'NEW VIDEO', video_url: '' }] })
              }
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Add video
            </button>
          </div>

          <div className="mt-6 max-w-xl">
            <CmsSectionFontFields
              value={draft.section_fonts.video_gallery}
              onChange={(nextValue) =>
                updateDraft({ section_fonts: { ...draft.section_fonts, video_gallery: nextValue } })
              }
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Intro label</label>
            <input
              type="text"
              value={draft.video_intro_text}
              onChange={(event) => updateDraft({ video_intro_text: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {draft.video_cards.map((video, index) => (
              <div key={`${video.title}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Video #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft({ video_cards: draft.video_cards.filter((_, itemIndex) => itemIndex !== index) })
                    }
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

                  <CmsAssetField
                    label="Video file"
                    value={video.video_url}
                    kind="video"
                    onChange={(value) => updateVideoCard(index, 'video_url', value)}
                    onUpload={(file) =>
                      void handleUploadAsset(file, (url) => updateVideoCard(index, 'video_url', url), `charm-bar-video-${index + 1}`, 'video')
                    }
                    previewClassName="h-28 w-full rounded-xl border border-gray-200 bg-black object-cover md:w-40"
                    uploadLabel="Upload video"
                    placeholder="Or paste a direct video URL"
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
                  {availableProducts.map((p: ProductPickerOption) => (
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
                Selected Best Sellers ({draft.best_seller_charms.length}/10)
              </label>
              
              {selectedProducts.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500">
                  No products selected for Best Seller.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedProducts.map((p: ProductPickerOption) => (
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
                  value={draft.section_fonts.how_it_works}
                  onChange={(nextValue) =>
                    updateDraft({ section_fonts: { ...draft.section_fonts, how_it_works: nextValue } })
                  }
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
                  value={draft.how_it_works_title}
                  onChange={(event) => updateDraft({ how_it_works_title: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Intro</label>
                <textarea
                  value={draft.how_it_works_intro}
                  onChange={(event) => updateDraft({ how_it_works_intro: event.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Numbered steps</label>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft({ how_it_works_steps: [...draft.how_it_works_steps, 'New instruction'] })
                    }
                    className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-700 hover:bg-gray-50"
                  >
                    Add step
                  </button>
                </div>

                <div className="space-y-3">
                  {draft.how_it_works_steps.map((step, index) => (
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
                        onClick={() =>
                          updateDraft({
                            how_it_works_steps: draft.how_it_works_steps.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
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
                    value={draft.how_it_works_cta_label}
                    onChange={(event) => updateDraft({ how_it_works_cta_label: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">CTA link</label>
                  <input
                    type="text"
                    value={draft.how_it_works_cta_href}
                    onChange={(event) => updateDraft({ how_it_works_cta_href: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <CmsAssetField
              label="How it works video"
              value={draft.how_it_works_video_url}
              kind="video"
              onChange={(value) => updateDraft({ how_it_works_video_url: value })}
              onUpload={(file) =>
                void handleUploadAsset(file, (url) => updateDraft({ how_it_works_video_url: url }), 'charm-bar-how-it-works', 'video')
              }
              previewClassName="h-28 w-full rounded-xl border border-gray-200 bg-black object-cover md:w-40"
              uploadLabel="Upload video"
              placeholder="Or paste a direct video URL"
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
