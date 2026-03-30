import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import {
  DEFAULT_EVENT_PAGE_SETTINGS,
  useEventSettings,
  type EventPageSettings,
  type EventSectionFonts,
  type ExperienceLink,
} from '../../hooks/useEventSettings';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';
import CmsAssetField from '../../components/admin/CmsAssetField';
import { uploadCmsAsset } from '../../lib/cmsAssetUpload';

type EventPageDraft = {
  hero_images: string[];
  magic_title: string;
  magic_description: string;
  magic_button_text: string;
  magic_button_link: string;
  magic_image: string;
  experience_title: string;
  experience_images: string[];
  experience_links: ExperienceLink[];
  section_fonts: EventSectionFonts;
};

function createEventDraft(source?: EventPageSettings | null): EventPageDraft {
  const next = source ?? DEFAULT_EVENT_PAGE_SETTINGS;
  const loadedHero = next.hero_images || [];
  const parsedLinks = (next.experience_links || []).slice(0, 3);

  return {
    hero_images:
      loadedHero.length >= 5
        ? loadedHero
        : Array(5)
            .fill('')
            .map((_, index) => loadedHero[index] || ''),
    magic_title: next.magic_title || '',
    magic_description: next.magic_description || '',
    magic_button_text: next.magic_button_text || '',
    magic_button_link: next.magic_button_link || '',
    magic_image: next.magic_images?.[0] || '',
    experience_title: next.experience_title || '',
    experience_images: Array(3)
      .fill('')
      .map((_, index) => next.experience_images?.[index] || ''),
    experience_links: Array(3)
      .fill({ title: '', subtitle: '', link: '' })
      .map((defaultLink, index) => parsedLinks[index] || defaultLink),
    section_fonts: next.section_fonts,
  };
}

export default function EventPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useEventSettings();

  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EventPageDraft>(() => createEventDraft(DEFAULT_EVENT_PAGE_SETTINGS));

  useEffect(() => {
    setDraft(createEventDraft(settings));
  }, [settings]);

  const updateDraft = useCallback((updates: Partial<EventPageDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  }, []);

  const handleUploadImage = useCallback(async (file: File, callback: (url: string) => void) => {
    try {
      await uploadCmsAsset({
        file,
        bucket: 'events-schedule',
        prefix: 'event-page',
        kind: 'image',
        showToast,
        onUploaded: callback,
      });
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
    }
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        hero_images: draft.hero_images,
        magic_title: draft.magic_title,
        magic_description: draft.magic_description,
        magic_button_text: draft.magic_button_text,
        magic_button_link: draft.magic_button_link,
        magic_images: draft.magic_image ? [draft.magic_image] : [],
        experience_title: draft.experience_title,
        experience_images: draft.experience_images,
        experience_links: draft.experience_links,
        section_fonts: draft.section_fonts,
      });
      showToast('success', 'Event page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <AdminLayout menuItems={ADMIN_MENU_ITEMS} menuSections={ADMIN_MENU_SECTIONS} defaultActiveMenuId="event-page" title="Event Page CMS" subtitle="Loading..." onLogout={signOut}>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96"></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="event-page"
      title="Event Page CMS"
      subtitle="Manage portfolio layout on /events"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Pastikan Anda mengklik <span className="font-bold text-primary">Simpan Pengaturan</span> di bagian bawah setelah membuat perubahan.
          </p>
        </div>

        {/* Hero Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-xl font-semibold text-gray-900">1. Hero Gallery Images</h2>
            <button
              onClick={() => updateDraft({ hero_images: [...draft.hero_images, ''] })}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Gambar
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {draft.hero_images.map((img, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group pt-8">
                <button
                  onClick={() => updateDraft({ hero_images: draft.hero_images.filter((_, i) => i !== idx) })}
                  className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Hapus Gambar"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <CmsAssetField
                  label={`Hero Image ${idx + 1}`}
                  value={img}
                  onChange={(value) => {
                    const next = [...draft.hero_images];
                    next[idx] = value;
                    updateDraft({ hero_images: next });
                  }}
                  onUpload={(file) =>
                    void handleUploadImage(file, (url) => {
                      const next = [...draft.hero_images];
                      next[idx] = url;
                      updateDraft({ hero_images: next });
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Magic Moment Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">2. "Capturing Your Magic Moment" Section</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={draft.section_fonts.magic}
                onChange={(nextValue) =>
                  updateDraft({ section_fonts: { ...draft.section_fonts, magic: nextValue } })
                }
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input
                  type="text"
                  value={draft.magic_title}
                  onChange={(e) => updateDraft({ magic_title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                <textarea
                  value={draft.magic_description}
                  onChange={(e) => updateDraft({ magic_description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={draft.magic_button_text}
                    onChange={(e) => updateDraft({ magic_button_text: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Button Link</label>
                  <input
                    type="text"
                    value={draft.magic_button_link}
                    onChange={(e) => updateDraft({ magic_button_link: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Magic Image (1)</h3>
              <CmsAssetField
                label="Cover Image"
                value={draft.magic_image}
                onChange={(value) => updateDraft({ magic_image: value })}
                onUpload={(file) => void handleUploadImage(file, (url) => updateDraft({ magic_image: url }))}
              />
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">3. "Choose Your Experience" Section</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={draft.section_fonts.experience}
                onChange={(nextValue) =>
                  updateDraft({ section_fonts: { ...draft.section_fonts, experience: nextValue } })
                }
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Section Title</label>
            <input
              type="text"
              value={draft.experience_title}
              onChange={(e) => updateDraft({ experience_title: e.target.value })}
              className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Experience Images (3)</h3>
              {draft.experience_images.map((img, idx) => (
                <div key={`exp-img-${idx}`}>
                  <CmsAssetField
                    label={`Bottom Image ${idx + 1}`}
                    value={img}
                    onChange={(value) => {
                      const next = [...draft.experience_images];
                      next[idx] = value;
                      updateDraft({ experience_images: next });
                    }}
                    onUpload={(file) =>
                      void handleUploadImage(file, (url) => {
                        const next = [...draft.experience_images];
                        next[idx] = url;
                        updateDraft({ experience_images: next });
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Experience Links (3)</h3>
              {draft.experience_links.map((link, idx) => (
                <div key={`exp-link-${idx}`} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Title (e.g., 1.)</label>
                       <input
                         type="text"
                         value={link.title}
                         onChange={(e) => {
                           const newLinks = [...draft.experience_links];
                           newLinks[idx].title = e.target.value;
                           updateDraft({ experience_links: newLinks });
                         }}
                         className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Subtitle</label>
                       <input
                         type="text"
                         value={link.subtitle}
                         onChange={(e) => {
                           const newLinks = [...draft.experience_links];
                           newLinks[idx].subtitle = e.target.value;
                           updateDraft({ experience_links: newLinks });
                         }}
                         className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                       />
                     </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Link URL</label>
                    <input
                      type="text"
                      value={link.link}
                      onChange={(e) => {
                        const newLinks = [...draft.experience_links];
                        newLinks[idx].link = e.target.value;
                        updateDraft({ experience_links: newLinks });
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#ff4b86] hover:bg-[#e63d75] text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-[#ff4b86]/30 hover:shadow-[#ff4b86]/50 active:scale-95 disabled:opacity-50 text-lg"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
