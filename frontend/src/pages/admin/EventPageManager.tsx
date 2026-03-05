import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { useEventSettings, type ExperienceLink } from '../../hooks/useEventSettings';

export default function EventPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useEventSettings();

  const [saving, setSaving] = useState(false);
  const [heroImages, setHeroImages] = useState<string[]>(Array(5).fill(''));
  const [magicTitle, setMagicTitle] = useState('');
  const [magicDescription, setMagicDescription] = useState('');
  const [magicButtonText, setMagicButtonText] = useState('');
  const [magicButtonLink, setMagicButtonLink] = useState('');
  const [magicImage, setMagicImage] = useState('');
  
  const [experienceTitle, setExperienceTitle] = useState('');
  const [experienceImages, setExperienceImages] = useState<string[]>(Array(3).fill(''));
  const [experienceLinks, setExperienceLinks] = useState<ExperienceLink[]>(
    Array(3).fill({ title: '', subtitle: '', link: '' })
  );

  useEffect(() => {
    if (settings) {
      setHeroImages(
        Array(5).fill('').map((_, i) => settings.hero_images?.[i] || '')
      );
      setMagicTitle(settings.magic_title || '');
      setMagicDescription(settings.magic_description || '');
      setMagicButtonText(settings.magic_button_text || '');
      setMagicButtonLink(settings.magic_button_link || '');
      setMagicImage(settings.magic_images?.[0] || '');
      
      setExperienceTitle(settings.experience_title || '');
      setExperienceImages(
        Array(3).fill('').map((_, i) => settings.experience_images?.[i] || '')
      );
      
      const parsedLinks = (settings.experience_links || []).slice(0, 3);
      setExperienceLinks(
        Array(3).fill({ title: '', subtitle: '', link: '' }).map((defaultLink, i) => parsedLinks[i] || defaultLink)
      );
    }
  }, [settings]);

  const handleUploadImage = useCallback(async (file: File, callback: (url: string) => void) => {
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
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `event-page-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `settings/${fileName}`;

      showToast('success', 'Uploading image...');
      
      const { error: uploadError } = await supabase.storage
        .from('events-schedule')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events-schedule')
        .getPublicUrl(filePath);

      callback(publicUrl);
      showToast('success', 'Image uploaded successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image');
    }
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        hero_images: heroImages,
        magic_title: magicTitle,
        magic_description: magicDescription,
        magic_button_text: magicButtonText,
        magic_button_link: magicButtonLink,
        magic_images: magicImage ? [magicImage] : [],
        experience_title: experienceTitle,
        experience_images: experienceImages,
        experience_links: experienceLinks,
      });
      showToast('success', 'Event page settings saved successfully');
    } catch (err: any) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout menuItems={ADMIN_MENU_ITEMS} menuSections={ADMIN_MENU_SECTIONS} defaultActiveMenuId="event-page-manager" title="Event Page CMS" subtitle="Loading..." onLogout={signOut}>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96"></div>
      </AdminLayout>
    );
  }

  const renderImageUploader = (value: string, onChange: (val: string) => void, label: string) => (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex gap-4 items-start">
        {value ? (
          <img src={value} alt="Preview" className="w-16 h-16 object-cover rounded shadow shrunk-0" />
        ) : (
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded shadow text-gray-400 shrink-0">
            <span className="material-symbols-outlined">image</span>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImage(file, onChange);
                e.target.value = ''; // reset input
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Pilih File untuk Diupload
            </button>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Atau masukkan Image URL di sini..."
          />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="event-page-manager" // Not matching standard menus might just leave it untethered if missing
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
            <h2 className="text-xl font-display font-bold text-gray-900">1. Hero Gallery Images</h2>
            <button
              onClick={() => setHeroImages([...heroImages, ''])}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Gambar
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {heroImages.map((img, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group pt-8">
                <button
                  onClick={() => setHeroImages(heroImages.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Hapus Gambar"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                {renderImageUploader(img, (val) => {
                  const newImgs = [...heroImages];
                  newImgs[idx] = val;
                  setHeroImages(newImgs);
                }, `Hero Image ${idx + 1}`)}
              </div>
            ))}
          </div>
        </section>

        {/* Magic Moment Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-display font-bold text-gray-900 border-b pb-2">2. "Capturing Your Magic Moment" Section</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input
                  type="text"
                  value={magicTitle}
                  onChange={(e) => setMagicTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                <textarea
                  value={magicDescription}
                  onChange={(e) => setMagicDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={magicButtonText}
                    onChange={(e) => setMagicButtonText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Button Link</label>
                  <input
                    type="text"
                    value={magicButtonLink}
                    onChange={(e) => setMagicButtonLink(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Magic Image (1)</h3>
              {renderImageUploader(magicImage, setMagicImage, 'Cover Image')}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-display font-bold text-gray-900 border-b pb-2">3. "Choose Your Experience" Section</h2>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Section Title</label>
            <input
              type="text"
              value={experienceTitle}
              onChange={(e) => setExperienceTitle(e.target.value)}
              className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Experience Images (3)</h3>
              {experienceImages.map((img, idx) => (
                <div key={`exp-img-${idx}`}>
                  {renderImageUploader(img, (val) => {
                    const newImgs = [...experienceImages];
                    newImgs[idx] = val;
                    setExperienceImages(newImgs);
                  }, `Bottom Image ${idx + 1}`)}
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Experience Links (3)</h3>
              {experienceLinks.map((link, idx) => (
                <div key={`exp-link-${idx}`} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Title (e.g., 1.)</label>
                       <input
                         type="text"
                         value={link.title}
                         onChange={(e) => {
                           const newLinks = [...experienceLinks];
                           newLinks[idx].title = e.target.value;
                           setExperienceLinks(newLinks);
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
                           const newLinks = [...experienceLinks];
                           newLinks[idx].subtitle = e.target.value;
                           setExperienceLinks(newLinks);
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
                        const newLinks = [...experienceLinks];
                        newLinks[idx].link = e.target.value;
                        setExperienceLinks(newLinks);
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
