import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import {
  DEFAULT_NEWS_PAGE_SETTINGS,
  useNewsSettings,
  type NewsPageSettings,
  type NewsProduct,
} from '../../hooks/useNewsSettings';
import { useProductPickerOptions, type ProductPickerOption } from '../../hooks/useProducts';
import { formatCurrency } from '../../utils/formatters';
import CmsSectionFontFields from '../../components/admin/CmsSectionFontFields';
import CmsAssetField from '../../components/admin/CmsAssetField';
import { uploadCmsAsset } from '../../lib/cmsAssetUpload';

type NewsPageDraft = Omit<NewsPageSettings, 'id'>;

function createNewsDraft(source?: NewsPageSettings | null): NewsPageDraft {
  const next = source ?? DEFAULT_NEWS_PAGE_SETTINGS;

  return {
    section_1_category: next.section_1_category || DEFAULT_NEWS_PAGE_SETTINGS.section_1_category,
    section_1_title: next.section_1_title || '',
    section_1_excerpt: next.section_1_excerpt || '',
    section_1_description: next.section_1_description || '',
    section_1_author: next.section_1_author || '',
    section_1_image: next.section_1_image || '',
    section_2_title: next.section_2_title || '',
    section_2_subtitle1: next.section_2_subtitle1 || '',
    section_2_subtitle2: next.section_2_subtitle2 || '',
    section_2_quotes: next.section_2_quotes || '',
    section_2_image: next.section_2_image || '',
    section_3_title: next.section_3_title || '',
    section_3_products: next.section_3_products || [],
    section_fonts: next.section_fonts,
  };
}

function ProductSearchComboBox({ products, onSelect }: { products: ProductPickerOption[], onSelect: (id: string) => void }) {
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
  const { data: allProducts, isLoading: isLoadingProducts } = useProductPickerOptions();

  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NewsPageDraft>(() => createNewsDraft(DEFAULT_NEWS_PAGE_SETTINGS));

  useEffect(() => {
    setDraft(createNewsDraft(settings));
  }, [settings]);

  const updateDraft = useCallback((updates: Partial<NewsPageDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  }, []);

  const handleUploadImage = useCallback(async (file: File, callback: (url: string) => void) => {
    try {
      await uploadCmsAsset({
        file,
        bucket: 'events-schedule',
        prefix: 'news-page',
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
      await updateSettings(draft);
      showToast('success', 'News page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = () => {
    updateDraft({
      section_3_products: [...draft.section_3_products, { image: '', brand: '', name: '', price: '', link: '' }],
    });
  };

  const removeProduct = (idx: number) => {
    const newProducts = [...draft.section_3_products];
    newProducts.splice(idx, 1);
    updateDraft({ section_3_products: newProducts });
  };

  const handleProductSelection = (idx: number, productIdStr: string) => {
    const newProducts = [...draft.section_3_products];
    
    // If they selected "Manual Input" or cleared
    if (!productIdStr) {
      // clear fields to allow manual input
       newProducts[idx] = { image: '', brand: '', name: '', price: '', link: '' };
       updateDraft({ section_3_products: newProducts });
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

    updateDraft({ section_3_products: newProducts });
  };

  const updateProduct = (idx: number, field: keyof NewsProduct, value: string) => {
    const newProducts = [...draft.section_3_products];
    newProducts[idx][field] = value;
    updateDraft({ section_3_products: newProducts });
  };

  if ((isLoading && !settings) || isLoadingProducts) {
    return (
      <AdminLayout menuItems={ADMIN_MENU_ITEMS} menuSections={ADMIN_MENU_SECTIONS} defaultActiveMenuId="news-page" title="News Page CMS" subtitle="Loading..." onLogout={signOut}>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96"></div>
      </AdminLayout>
    );
  }

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
                value={draft.section_fonts.section_1}
                onChange={(nextValue) =>
                  updateDraft({ section_fonts: { ...draft.section_fonts, section_1: nextValue } })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Category Label (e.g. FASHION)</label>
                <input
                  type="text"
                  value={draft.section_1_category}
                  onChange={(e) => updateDraft({ section_1_category: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input
                  type="text"
                  value={draft.section_1_title}
                  onChange={(e) => updateDraft({ section_1_title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Excerpt</label>
                <textarea
                  value={draft.section_1_excerpt}
                  onChange={(e) => updateDraft({ section_1_excerpt: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Body Description</label>
                <textarea
                  value={draft.section_1_description}
                  onChange={(e) => updateDraft({ section_1_description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Author (e.g. By Amélie Schiffer)</label>
                <input
                  type="text"
                  value={draft.section_1_author}
                  onChange={(e) => updateDraft({ section_1_author: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <CmsAssetField
                label="Section 1 Image"
                value={draft.section_1_image}
                onChange={(value) => updateDraft({ section_1_image: value })}
                onUpload={(file) => void handleUploadImage(file, (url) => updateDraft({ section_1_image: url }))}
              />
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">2. Section 2 (Cold-Hearted)</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={draft.section_fonts.section_2}
                onChange={(nextValue) =>
                  updateDraft({ section_fonts: { ...draft.section_fonts, section_2: nextValue } })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <textarea
                  value={draft.section_2_title}
                  onChange={(e) => updateDraft({ section_2_title: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Subtitle 1</label>
                  <input
                    type="text"
                    value={draft.section_2_subtitle1}
                    onChange={(e) => updateDraft({ section_2_subtitle1: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Subtitle 2</label>
                  <input
                    type="text"
                    value={draft.section_2_subtitle2}
                    onChange={(e) => updateDraft({ section_2_subtitle2: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Quotes/Lyrics</label>
                <textarea
                  value={draft.section_2_quotes}
                  onChange={(e) => updateDraft({ section_2_quotes: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <CmsAssetField
                label="Section 2 Image"
                value={draft.section_2_image}
                onChange={(value) => updateDraft({ section_2_image: value })}
                onUpload={(file) => void handleUploadImage(file, (url) => updateDraft({ section_2_image: url }))}
              />
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 border-b pb-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">3. Section 3 (Her Essentials)</h2>
            <div className="w-full max-w-xl">
              <CmsSectionFontFields
                value={draft.section_fonts.section_3}
                onChange={(nextValue) =>
                  updateDraft({ section_fonts: { ...draft.section_fonts, section_3: nextValue } })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Section Title</label>
            <input
              type="text"
              value={draft.section_3_title}
              onChange={(e) => updateDraft({ section_3_title: e.target.value })}
              className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Products ({draft.section_3_products.length})</h3>
              <button
                onClick={addProduct}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tambah Produk
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {draft.section_3_products.map((prod, idx) => (
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

                  <CmsAssetField
                    label="Product Image"
                    value={prod.image}
                    onChange={(value) => updateProduct(idx, 'image', value)}
                    onUpload={(file) => void handleUploadImage(file, (url) => updateProduct(idx, 'image', url))}
                  />
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
