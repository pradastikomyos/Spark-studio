import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { DEFAULT_NEWS_PAGE_SETTINGS, useNewsSettings, type NewsProduct, type NewsSectionFonts } from '../../hooks/useNewsSettings';
import { useProducts, type Product } from '../../hooks/useProducts';
import { formatCurrency } from '../../utils/formatters';
import { slugify } from '../../utils/merchant';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';

function ProductSearchComboBox({ products, onSelect }: { products: Product[], onSelect: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Auto-close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="relative">
      <div className="relative">
         <input
           type="text"
           placeholder="Cari produk berdasarkan nama..."
           value={searchTerm}
           onChange={(e) => {
             setSearchTerm(e.target.value);
             setIsOpen(true);
           }}
           onFocus={() => setIsOpen(true)}
           onBlur={() => {
             // Delay to allow click event on options to fire
             setTimeout(() => setIsOpen(false), 200);
           }}
           className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 pr-8 text-sm focus:outline-none focus:border-primary text-gray-700"
         />
         <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
            search
         </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-xl ring-1 ring-black/5">
          <div
            className="px-3 py-2.5 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary cursor-pointer border-b border-gray-100 flex items-center gap-2 font-medium"
            onClick={() => {
              onSelect('');
              setSearchTerm('');
              setIsOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[18px]">clear_all</span>
            Bersihkan Pilihan (Input Manual)
          </div>
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-3"
              onClick={() => {
                onSelect(p.id.toString());
                setSearchTerm(p.name);
                setIsOpen(false);
              }}
            >
              {p.image ? (
                <img src={p.image} className="w-8 h-8 rounded object-cover bg-white" />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500 font-medium tracking-wide uppercase mt-0.5">{formatCurrency(p.price)}</div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
               <span className="material-symbols-outlined text-gray-300 text-3xl">search_off</span>
               <span>Tidak ada produk yang cocok.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useNewsSettings();
  const { data: allProducts, isLoading: isLoadingProducts } = useProducts();

  const [saving, setSaving] = useState(false);

  // Section 1
  const [s1Category, setS1Category] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_category);
  const [s1Title, setS1Title] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_title);
  const [s1Excerpt, setS1Excerpt] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_excerpt);
  const [s1Description, setS1Description] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_description);
  const [s1Author, setS1Author] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_author);
  const [s1Image, setS1Image] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_1_image);

  // Section 2
  const [s2Title, setS2Title] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_2_title);
  const [s2Subtitle1, setS2Subtitle1] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle1);
  const [s2Subtitle2, setS2Subtitle2] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle2);
  const [s2Quotes, setS2Quotes] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_2_quotes);
  const [s2Image, setS2Image] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_2_image);

  // Section 3
  const [s3Title, setS3Title] = useState(DEFAULT_NEWS_PAGE_SETTINGS.section_3_title);
  const [s3Products, setS3Products] = useState<NewsProduct[]>(DEFAULT_NEWS_PAGE_SETTINGS.section_3_products);
  const [sectionFonts, setSectionFonts] = useState<NewsSectionFonts>(DEFAULT_NEWS_PAGE_SETTINGS.section_fonts);

  useEffect(() => {
    if (settings) {
      setS1Category(settings.section_1_category || 'FASHION');
      setS1Title(settings.section_1_title || '');
      setS1Excerpt(settings.section_1_excerpt || '');
      setS1Description(settings.section_1_description || '');
      setS1Author(settings.section_1_author || '');
      setS1Image(settings.section_1_image || '');

      setS2Title(settings.section_2_title || '');
      setS2Subtitle1(settings.section_2_subtitle1 || '');
      setS2Subtitle2(settings.section_2_subtitle2 || '');
      setS2Quotes(settings.section_2_quotes || '');
      setS2Image(settings.section_2_image || '');

      setS3Title(settings.section_3_title || '');
      setS3Products(settings.section_3_products || []);
      setSectionFonts(settings.section_fonts);
    } else {
      setS1Category(DEFAULT_NEWS_PAGE_SETTINGS.section_1_category);
      setS1Title(DEFAULT_NEWS_PAGE_SETTINGS.section_1_title);
      setS1Excerpt(DEFAULT_NEWS_PAGE_SETTINGS.section_1_excerpt);
      setS1Description(DEFAULT_NEWS_PAGE_SETTINGS.section_1_description);
      setS1Author(DEFAULT_NEWS_PAGE_SETTINGS.section_1_author);
      setS1Image(DEFAULT_NEWS_PAGE_SETTINGS.section_1_image);
      setS2Title(DEFAULT_NEWS_PAGE_SETTINGS.section_2_title);
      setS2Subtitle1(DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle1);
      setS2Subtitle2(DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle2);
      setS2Quotes(DEFAULT_NEWS_PAGE_SETTINGS.section_2_quotes);
      setS2Image(DEFAULT_NEWS_PAGE_SETTINGS.section_2_image);
      setS3Title(DEFAULT_NEWS_PAGE_SETTINGS.section_3_title);
      setS3Products(DEFAULT_NEWS_PAGE_SETTINGS.section_3_products);
      setSectionFonts(DEFAULT_NEWS_PAGE_SETTINGS.section_fonts);
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
      const baseName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'news-page-image';
      const fileName = `news-page-${baseName}-${Date.now()}.${ext}`;
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
        section_1_category: s1Category,
        section_1_title: s1Title,
        section_1_excerpt: s1Excerpt,
        section_1_description: s1Description,
        section_1_author: s1Author,
        section_1_image: s1Image,

        section_2_title: s2Title,
        section_2_subtitle1: s2Subtitle1,
        section_2_subtitle2: s2Subtitle2,
        section_2_quotes: s2Quotes,
        section_2_image: s2Image,

        section_3_title: s3Title,
        section_3_products: s3Products,
        section_fonts: sectionFonts,
      });
      showToast('success', 'News page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = () => {
    setS3Products([...s3Products, { image: '', brand: '', name: '', price: '', link: '' }]);
  };

  const removeProduct = (idx: number) => {
    const newProducts = [...s3Products];
    newProducts.splice(idx, 1);
    setS3Products(newProducts);
  };

  const handleProductSelection = (idx: number, productIdStr: string) => {
    const newProducts = [...s3Products];
    
    // If they selected "Manual Input" or cleared
    if (!productIdStr) {
      // clear fields to allow manual input
       newProducts[idx] = { image: '', brand: '', name: '', price: '', link: '' };
       setS3Products(newProducts);
       return;
    }

    const productId = parseInt(productIdStr, 10);
    const selectedProduct = allProducts?.find(p => p.id === productId);

    if (selectedProduct) {
      newProducts[idx] = {
        image: selectedProduct.image || '',
        brand: selectedProduct.categorySlug?.toUpperCase() || 'SPARK STAGE',
        name: selectedProduct.name,
        price: formatCurrency(selectedProduct.price),
        link: `/shop/product/${selectedProduct.id}`
      };
    }
    
    setS3Products(newProducts);
  };

  const updateProduct = (idx: number, field: keyof NewsProduct, value: string) => {
    const newProducts = [...s3Products];
    newProducts[idx][field] = value;
    setS3Products(newProducts);
  };

  if ((isLoading && !settings) || isLoadingProducts) {
    return (
      <AdminLayout menuItems={ADMIN_MENU_ITEMS} menuSections={ADMIN_MENU_SECTIONS} defaultActiveMenuId="news-page" title="News Page CMS" subtitle="Loading..." onLogout={signOut}>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96"></div>
      </AdminLayout>
    );
  }

  const renderImageUploader = (value: string, onChange: (val: string) => void, label: string) => (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex gap-4 items-start">
        {value ? (
          <img src={value} alt="Preview" className="w-16 h-16 object-cover rounded shadow shrink-0" />
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
      defaultActiveMenuId="news-page"
      title="News Page CMS"
      subtitle="Manage layout and content on /news"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Pastikan Anda mengklik <span className="font-bold text-primary">Simpan Pengaturan</span> di bagian bawah setelah membuat perubahan.
          </p>
        </div>

        {/* Section 1 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">1. Section 1 (Star Girl)</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={sectionFonts.section_1}
                onChange={(nextValue) => setSectionFonts((current) => ({ ...current, section_1: nextValue }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Category Label (e.g. FASHION)</label>
                <input
                  type="text"
                  value={s1Category}
                  onChange={(e) => setS1Category(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input
                  type="text"
                  value={s1Title}
                  onChange={(e) => setS1Title(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Excerpt</label>
                <textarea
                  value={s1Excerpt}
                  onChange={(e) => setS1Excerpt(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Body Description</label>
                <textarea
                  value={s1Description}
                  onChange={(e) => setS1Description(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Author (e.g. By Amélie Schiffer)</label>
                <input
                  type="text"
                  value={s1Author}
                  onChange={(e) => setS1Author(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {renderImageUploader(s1Image, setS1Image, 'Section 1 Image')}
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">2. Section 2 (Cold-Hearted)</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={sectionFonts.section_2}
                onChange={(nextValue) => setSectionFonts((current) => ({ ...current, section_2: nextValue }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <textarea
                  value={s2Title}
                  onChange={(e) => setS2Title(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Subtitle 1</label>
                  <input
                    type="text"
                    value={s2Subtitle1}
                    onChange={(e) => setS2Subtitle1(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Subtitle 2</label>
                  <input
                    type="text"
                    value={s2Subtitle2}
                    onChange={(e) => setS2Subtitle2(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Quotes/Lyrics</label>
                <textarea
                  value={s2Quotes}
                  onChange={(e) => setS2Quotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {renderImageUploader(s2Image, setS2Image, 'Section 2 Image')}
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">3. Section 3 (Her Essentials)</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={sectionFonts.section_3}
                onChange={(nextValue) => setSectionFonts((current) => ({ ...current, section_3: nextValue }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Section Title</label>
            <input
              type="text"
              value={s3Title}
              onChange={(e) => setS3Title(e.target.value)}
              className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Products ({s3Products.length})</h3>
              <button
                onClick={addProduct}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tambah Produk
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {s3Products.map((prod, idx) => (
                <div key={`prod-${idx}`} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 relative group">
                  <button
                    onClick={() => removeProduct(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                    title="Hapus Produk"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>

                  <div className="mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Cari & Pilih Dari Toko (Auto-fill)</label>
                    <ProductSearchComboBox 
                      products={allProducts || []} 
                      onSelect={(idStr) => handleProductSelection(idx, idStr)} 
                    />
                  </div>

                  {renderImageUploader(prod.image, (val) => updateProduct(idx, 'image', val), `Product Image`)}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Brand</label>
                      <input
                        type="text"
                        value={prod.brand}
                        onChange={(e) => updateProduct(idx, 'brand', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Price</label>
                      <input
                        type="text"
                        value={prod.price}
                        onChange={(e) => updateProduct(idx, 'price', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Link / URL</label>
                      <input
                        type="text"
                        value={prod.link}
                        onChange={(e) => updateProduct(idx, 'link', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
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
