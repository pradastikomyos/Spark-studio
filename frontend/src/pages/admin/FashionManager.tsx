import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { uploadFashionImage, deleteFashionImage } from '../../utils/uploadFashionImage';

// ─── Types ──────────────────────────────────────────────────────────────
interface FashionCollection {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    sort_order: number;
}

interface FashionLook {
    id: number;
    collection_id: number;
    look_number: number;
    model_image_url: string;
    model_name: string | null;
    sort_order: number;
    items: FashionLookItem[];
}

interface FashionLookItem {
    id: number;
    look_id: number;
    product_variant_id: number;
    label: string | null;
    sort_order: number;
    resolved_image_url: string | null;
    product_variant: {
        id: number;
        name: string;
        sku: string;
        price: number | null;
        product: {
            id: number;
            name: string;
            slug: string;
            image_url: string | null;
        };
    } | null;
}

interface ProductVariantOption {
    id: number;
    name: string;
    sku: string;
    price: number | null;
    product_name: string;
    product_id: number;
}

type View = 'list' | 'editor';

function toSlug(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatPrice(price: number | null): string {
    if (price === null) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

// ─── Carousel transforms (same logic as customer page) ──────────────────
const VISIBLE_AHEAD = 3;
const SPRING = { type: 'spring' as const, stiffness: 260, damping: 28 };

function getModelTransform(offset: number, containerWidth: number) {
    const absOffset = Math.abs(offset);
    if (offset < 0 || absOffset > VISIBLE_AHEAD) {
        return { scale: 0, opacity: 0, x: containerWidth + 100, blur: 14, zIndex: 0, display: false };
    }
    const scaleMap = [1, 0.75, 0.55, 0.4];
    const scale = scaleMap[absOffset] ?? 0.35;
    const opacityMap = [1, 0.85, 0.55, 0.3];
    const opacity = opacityMap[absOffset] ?? 0.2;
    const blurMap = [0, 2.5, 5, 8];
    const blur = blurMap[absOffset] ?? 10;
    const rightEdge = containerWidth * 0.6;
    const spacing = containerWidth * 0.2;
    const x = rightEdge - (absOffset * spacing);
    const zIndex = 10 - absOffset;
    return { scale, opacity, x, blur, zIndex, display: true };
}

// ─── Component ──────────────────────────────────────────────────────────
export default function FashionManager() {
    const { signOut } = useAuth();
    const { showToast } = useToast();

    const [view, setView] = useState<View>('list');
    const [collections, setCollections] = useState<FashionCollection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<FashionCollection | null>(null);
    const [looks, setLooks] = useState<FashionLook[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Collection form
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Look editor
    const [activeIndex, setActiveIndex] = useState(0);
    const [uploadingLookId, setUploadingLookId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingLookUpload, setPendingLookUpload] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState(700);
    const [isDragging, setIsDragging] = useState(false);

    // Model name editing
    const [editingModelName, setEditingModelName] = useState(false);
    const [modelNameValue, setModelNameValue] = useState('');

    // Collection info editing
    const [editingCollectionInfo, setEditingCollectionInfo] = useState(false);
    const [collectionTitle, setCollectionTitle] = useState('');
    const [collectionDesc, setCollectionDesc] = useState('');

    // Product picker
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<ProductVariantOption[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);

    // ── Fetchers ──────────────────────────────────────────────────────────
    const fetchCollections = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('fashion_collections')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) showToast('error', `Error: ${error.message}`);
        const cols = (data ?? []) as FashionCollection[];
        setCollections(cols);
        setLoading(false);

        // Auto-open editor if only 1 collection exists
        if (cols.length === 1 && !selectedCollection) {
            setSelectedCollection(cols[0]);
            setCollectionTitle(cols[0].title);
            setCollectionDesc(cols[0].description || '');
            setView('editor');
            fetchLooks(cols[0].id);
        }
    }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchLooks = useCallback(async (collectionId: number) => {
        const { data: looksData, error: looksError } = await supabase
            .from('fashion_looks').select('*')
            .eq('collection_id', collectionId)
            .order('sort_order', { ascending: true });
        if (looksError) { showToast('error', `Error: ${looksError.message}`); return; }
        if (!looksData || looksData.length === 0) { setLooks([]); return; }

        const lookIds = looksData.map((l) => l.id);
        const { data: itemsData } = await supabase
            .from('fashion_look_items')
            .select(`id, look_id, product_variant_id, label, sort_order,
                product_variants!inner ( id, name, sku, price, products!inner ( id, name, slug, image_url ) )`)
            .in('look_id', lookIds)
            .order('sort_order', { ascending: true });

        // Build items list
        const allItems: FashionLookItem[] = [];
        const itemsByLook = new Map<number, FashionLookItem[]>();
        if (itemsData) {
            for (const raw of itemsData as unknown as Record<string, unknown>[]) {
                const lookId = raw.look_id as number;
                const list = itemsByLook.get(lookId) || [];
                const pv = raw.product_variants as Record<string, unknown> | null;
                const prod = pv?.products as Record<string, unknown> | null;
                const item: FashionLookItem = {
                    id: raw.id as number, look_id: lookId,
                    product_variant_id: raw.product_variant_id as number,
                    label: raw.label as string | null, sort_order: raw.sort_order as number,
                    resolved_image_url: null,
                    product_variant: pv ? {
                        id: pv.id as number, name: pv.name as string, sku: pv.sku as string,
                        price: pv.price as number | null,
                        product: prod ? { id: prod.id as number, name: prod.name as string, slug: prod.slug as string, image_url: prod.image_url as string | null } : null as never,
                    } : null,
                };
                list.push(item);
                allItems.push(item);
                itemsByLook.set(lookId, list);
            }
        }

        // Fetch product images for all product IDs
        const productIds = [...new Set(allItems.map(i => i.product_variant?.product?.id).filter(Boolean))] as number[];
        if (productIds.length > 0) {
            const { data: imgData } = await supabase
                .from('product_images')
                .select('product_id, image_url')
                .in('product_id', productIds)
                .eq('is_primary', true);
            if (imgData) {
                const imgMap = new Map<number, string>();
                for (const img of imgData) imgMap.set(img.product_id, img.image_url);
                for (const item of allItems) {
                    const pid = item.product_variant?.product?.id;
                    if (pid) item.resolved_image_url = imgMap.get(pid) || item.product_variant?.product?.image_url || null;
                }
            }
        }

        setLooks(looksData.map((look) => ({
            id: look.id, collection_id: look.collection_id,
            look_number: look.look_number, model_image_url: look.model_image_url,
            model_name: look.model_name, sort_order: look.sort_order,
            items: itemsByLook.get(look.id) || [],
        })));
    }, [showToast]);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    // ── Collection Actions ────────────────────────────────────────────────
    const handleCreateCollection = async () => {
        if (!formTitle.trim()) return;
        setSaving(true);
        const slug = toSlug(formTitle);
        const { error } = await supabase.from('fashion_collections').insert({
            title: formTitle.trim(), slug,
            description: formDescription.trim() || null, sort_order: collections.length,
        });
        if (error) showToast('error', `Error: ${error.message}`);
        else { showToast('success', 'Koleksi berhasil dibuat!'); setFormTitle(''); setFormDescription(''); setShowCreateForm(false); fetchCollections(); }
        setSaving(false);
    };

    const handleToggleActive = async (collection: FashionCollection) => {
        const { error } = await supabase.from('fashion_collections')
            .update({ is_active: !collection.is_active, updated_at: new Date().toISOString() })
            .eq('id', collection.id);
        if (error) showToast('error', `Error: ${error.message}`);
        else fetchCollections();
    };

    const handleDeleteCollection = async (id: number) => {
        if (!confirm('Hapus koleksi ini? Semua looks akan ikut terhapus.')) return;
        const { error } = await supabase.from('fashion_collections').delete().eq('id', id);
        if (error) showToast('error', `Error: ${error.message}`);
        else { showToast('success', 'Koleksi dihapus.'); fetchCollections(); }
    };

    const openEditor = (collection: FashionCollection) => {
        setSelectedCollection(collection);
        setCollectionTitle(collection.title);
        setCollectionDesc(collection.description || '');
        setView('editor');
        setActiveIndex(0);
        fetchLooks(collection.id);
    };

    const handleSaveCollectionInfo = async () => {
        if (!selectedCollection || !collectionTitle.trim()) return;
        const newSlug = toSlug(collectionTitle);
        const { error } = await supabase.from('fashion_collections')
            .update({ title: collectionTitle.trim(), description: collectionDesc.trim() || null, slug: newSlug, updated_at: new Date().toISOString() })
            .eq('id', selectedCollection.id);
        if (error) showToast('error', `Error: ${error.message}`);
        else {
            showToast('success', 'Info koleksi diperbarui!');
            setSelectedCollection({ ...selectedCollection, title: collectionTitle.trim(), description: collectionDesc.trim() || null, slug: newSlug });
            fetchCollections();
        }
        setEditingCollectionInfo(false);
    };

    // ── Look Actions ──────────────────────────────────────────────────────
    const handleAddLook = async () => {
        if (!selectedCollection) return;
        const nextNumber = looks.length + 1;
        const { error } = await supabase.from('fashion_looks').insert({
            collection_id: selectedCollection.id, look_number: nextNumber,
            model_image_url: '', sort_order: looks.length,
        });
        if (error) showToast('error', `Error: ${error.message}`);
        else {
            showToast('success', `Look ${nextNumber} ditambahkan!`);
            await fetchLooks(selectedCollection.id);
            setActiveIndex(looks.length); // focus on new look
        }
    };

    const handleUploadModel = async (lookId: number, file: File) => {
        if (!selectedCollection) return;
        setUploadingLookId(lookId);
        try {
            const url = await uploadFashionImage(file, selectedCollection.id, lookId);
            const { error } = await supabase.from('fashion_looks')
                .update({ model_image_url: url, updated_at: new Date().toISOString() })
                .eq('id', lookId);
            if (error) throw new Error(error.message);
            showToast('success', 'Foto model berhasil diupload!');
            fetchLooks(selectedCollection.id);
        } catch (err: unknown) {
            showToast('error', `Upload gagal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        setUploadingLookId(null);
    };

    const handleSaveModelName = async (lookId: number) => {
        const { error } = await supabase.from('fashion_looks')
            .update({ model_name: modelNameValue.trim() || null, updated_at: new Date().toISOString() })
            .eq('id', lookId);
        if (error) showToast('error', `Error: ${error.message}`);
        else if (selectedCollection) fetchLooks(selectedCollection.id);
        setEditingModelName(false);
    };

    const handleDeleteLook = async (lookId: number, imageUrl: string) => {
        if (!selectedCollection) return;
        if (!confirm('Hapus look ini?')) return;
        if (imageUrl) { try { await deleteFashionImage(imageUrl); } catch { /* */ } }
        const { error } = await supabase.from('fashion_looks').delete().eq('id', lookId);
        if (error) showToast('error', `Error: ${error.message}`);
        else {
            showToast('success', 'Look dihapus.');
            fetchLooks(selectedCollection.id);
            setActiveIndex(Math.max(0, activeIndex - 1));
        }
    };

    // ── Product linking ───────────────────────────────────────────────────
    const searchProducts = async (query: string) => {
        setProductSearch(query);
        if (query.length < 2) { setProductResults([]); return; }
        setSearchingProducts(true);
        const { data } = await supabase.from('product_variants')
            .select('id, name, sku, price, products!inner ( id, name )')
            .ilike('name', `%${query}%`).eq('is_active', true).limit(10);
        if (data) {
            setProductResults((data as unknown as Array<Record<string, unknown>>).map((d) => {
                const prod = d.products as Record<string, unknown>;
                return { id: d.id as number, name: d.name as string, sku: d.sku as string, price: d.price as number | null, product_name: prod.name as string, product_id: prod.id as number };
            }));
        }
        setSearchingProducts(false);
    };

    const handleLinkProduct = async (lookId: number, variantId: number) => {
        const look = looks.find((l) => l.id === lookId);
        const { error } = await supabase.from('fashion_look_items').insert({
            look_id: lookId, product_variant_id: variantId, sort_order: look ? look.items.length : 0,
        });
        if (error) showToast('error', `Error: ${error.message}`);
        else {
            showToast('success', 'Produk ditambahkan!');
            setShowProductPicker(false); setProductSearch(''); setProductResults([]);
            if (selectedCollection) fetchLooks(selectedCollection.id);
        }
    };

    const handleUnlinkProduct = async (itemId: number) => {
        const { error } = await supabase.from('fashion_look_items').delete().eq('id', itemId);
        if (error) showToast('error', `Error: ${error.message}`);
        else if (selectedCollection) fetchLooks(selectedCollection.id);
    };

    // ── Carousel nav ─────────────────────────────────────────────────────
    const goNext = useCallback(() => { if (activeIndex < looks.length - 1) setActiveIndex(activeIndex + 1); }, [activeIndex, looks.length]);
    const goPrev = useCallback(() => { if (activeIndex > 0) setActiveIndex(activeIndex - 1); }, [activeIndex]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const threshold = 50;
        if (info.offset.x > threshold) goNext();
        else if (info.offset.x < -threshold) goPrev();
    };

    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const ro = new ResizeObserver((entries) => { for (const e of entries) setContainerWidth(e.contentRect.width); });
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    const activeLook = looks[activeIndex] ?? null;

    const visibleLooks = looks.map((look, index) => ({
        look, index, offset: index - activeIndex,
    })).filter(({ offset }) => offset >= 0 && offset <= VISIBLE_AHEAD);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AdminLayout
            title="Fashion Lookbook"
            subtitle="Kelola koleksi fashion lookbook"
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="fashion-lookbook"
            onLogout={signOut}
        >
            <input ref={fileInputRef} type="file" accept=".png,image/png" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f && pendingLookUpload) handleUploadModel(pendingLookUpload, f); e.target.value = ''; setPendingLookUpload(null); }}
            />

            {view === 'list' ? (
                // ── Collections List ──────────────────────────────────────────
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800">Koleksi</h2>
                        <button onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                            {showCreateForm ? 'Batal' : '+ Koleksi Baru'}
                        </button>
                    </div>

                    {/* Step-by-step guidance */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-bold mb-2">📋 Alur Kerja Lookbook:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                            <li><strong>Buat Koleksi</strong> — beri judul dan deskripsi</li>
                            <li><strong>Edit Koleksi</strong> — klik Edit untuk masuk visual editor</li>
                            <li><strong>Tambah Looks, Upload Foto, Hubungkan Produk</strong></li>
                            <li><strong>Aktifkan Koleksi</strong> — toggle agar terlihat di halaman Fashion</li>
                        </ol>
                    </div>

                    {showCreateForm && (
                        <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
                            <input type="text" placeholder="Judul koleksi (e.g. Spring Summer 2026)"
                                value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                            <textarea placeholder="Deskripsi (opsional)" value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)} rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none" />
                            <button onClick={handleCreateCollection} disabled={saving || !formTitle.trim()}
                                className="px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                                {saving ? 'Menyimpan...' : 'Buat Koleksi'}
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                    ) : collections.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <span className="material-symbols-outlined text-5xl mb-4 block">styler</span>
                            <p className="text-sm">Belum ada koleksi. Buat koleksi pertama!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {collections.map((col) => (
                                <div key={col.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-800 truncate">{col.title}</h3>
                                        <p className="text-xs text-gray-400">{col.slug}</p>
                                    </div>
                                    <button onClick={() => handleToggleActive(col)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${col.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {col.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                    <button onClick={() => openEditor(col)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors" title="Edit looks">
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button onClick={() => handleDeleteCollection(col.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Hapus">
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // ── WYSIWYG Look Editor ───────────────────────────────────────
                <div className="space-y-4">
                    {/* Top bar — editable title & description */}
                    <div className="flex items-start gap-4">
                        <button onClick={() => { setView('list'); setSelectedCollection(null); setLooks([]); setEditingCollectionInfo(false); }}
                            className="p-2 text-gray-500 hover:text-gray-900 transition-colors mt-0.5">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="flex-1 min-w-0">
                            {editingCollectionInfo ? (
                                <div className="space-y-2">
                                    <input type="text" value={collectionTitle} onChange={(e) => setCollectionTitle(e.target.value)}
                                        placeholder="Judul koleksi" autoFocus
                                        className="w-full px-3 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                                    <textarea value={collectionDesc} onChange={(e) => setCollectionDesc(e.target.value)}
                                        placeholder="Deskripsi koleksi (opsional)" rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none" />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveCollectionInfo}
                                            className="px-4 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                                            Simpan
                                        </button>
                                        <button onClick={() => { setEditingCollectionInfo(false); setCollectionTitle(selectedCollection?.title || ''); setCollectionDesc(selectedCollection?.description || ''); }}
                                            className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group cursor-pointer" onClick={() => setEditingCollectionInfo(true)}>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-gray-800">{selectedCollection?.title}</h2>
                                        <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-600 transition-colors">edit</span>
                                    </div>
                                    {selectedCollection?.description ? (
                                        <p className="text-xs text-gray-400 mt-0.5 max-w-lg">{selectedCollection.description}</p>
                                    ) : (
                                        <p className="text-xs text-gray-300 mt-0.5 group-hover:text-gray-500">+ Tambah deskripsi</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <button onClick={handleAddLook}
                            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">
                            + Tambah Look
                        </button>
                    </div>

                    {looks.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-20 text-center">
                            <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">styler</span>
                            <p className="text-gray-500 text-sm mb-3">Belum ada looks. Tambah look pertama!</p>
                            <button onClick={handleAddLook}
                                className="px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                                + Tambah Look
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-5">
                            {/* LEFT: Carousel preview (mirrors customer page) */}
                            <div className="flex-1 min-w-0 bg-[#f5f3f0] rounded-xl overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
                                {/* Carousel area */}
                                <motion.div
                                    ref={containerRef}
                                    className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
                                    drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.08}
                                    onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}
                                    style={{ touchAction: 'pan-y' }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {visibleLooks.map(({ look, index, offset }) => {
                                            const t = getModelTransform(offset, containerWidth);
                                            if (!t.display) return null;
                                            const isActive = offset === 0;
                                            return (
                                                <motion.div
                                                    key={look.id}
                                                    className="absolute bottom-0"
                                                    initial={{ scale: 0.3, opacity: 0, x: containerWidth + 100 }}
                                                    animate={{ scale: t.scale, opacity: t.opacity, x: t.x, filter: `blur(${t.blur}px)`, zIndex: t.zIndex }}
                                                    exit={{ scale: 0.3, opacity: 0, x: containerWidth + 200 }}
                                                    transition={SPRING}
                                                    onClick={() => { if (!isDragging && !isActive) setActiveIndex(index); }}
                                                    style={{ willChange: 'transform, filter, opacity', cursor: isActive ? 'default' : 'pointer', transformOrigin: 'bottom center' }}
                                                >
                                                    {look.model_image_url ? (
                                                        <div className="relative group">
                                                            <img src={look.model_image_url} alt={`Look ${look.look_number}`}
                                                                className="h-full max-h-[400px] w-auto max-w-none object-contain pointer-events-none select-none"
                                                                draggable={false} />
                                                            {/* Overlay on active: click to re-upload */}
                                                            {isActive && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setPendingLookUpload(look.id); fileInputRef.current?.click(); }}
                                                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-auto"
                                                                >
                                                                    <span className="bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow">
                                                                        📷 Ganti Foto
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : isActive ? (
                                                        /* Empty: click to upload */
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPendingLookUpload(look.id); fileInputRef.current?.click(); }}
                                                            className="w-48 h-72 bg-white/80 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-white transition-colors pointer-events-auto"
                                                        >
                                                            {uploadingLookId === look.id ? (
                                                                <span className="text-sm text-gray-500 animate-pulse">Uploading...</span>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-3xl text-gray-300">cloud_upload</span>
                                                                    <span className="text-xs font-semibold text-gray-500">Klik untuk upload</span>
                                                                    <span className="text-[10px] text-gray-400">PNG transparan</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div className="w-32 h-48 bg-gray-200/50 rounded-lg flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-2xl text-gray-300">person</span>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Bottom bar: Look info + nav + actions */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/50 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-800 tracking-wide uppercase">
                                                Look {String(activeLook?.look_number ?? 0).padStart(2, '0')}
                                            </h3>
                                            {/* Editable model name */}
                                            {editingModelName ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <input type="text" value={modelNameValue} onChange={(e) => setModelNameValue(e.target.value)}
                                                        placeholder="Nama model" autoFocus
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && activeLook) handleSaveModelName(activeLook.id); if (e.key === 'Escape') setEditingModelName(false); }}
                                                        className="px-2 py-0.5 text-xs border border-gray-300 rounded w-28 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                                                    <button onClick={() => activeLook && handleSaveModelName(activeLook.id)} className="text-emerald-600 text-[10px] font-bold">✓</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setEditingModelName(true); setModelNameValue(activeLook?.model_name || ''); }}
                                                    className="text-[11px] text-gray-400 hover:text-gray-700 mt-0.5 block">
                                                    {activeLook?.model_name || '+ Tambah nama model'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Resolution info */}
                                        {activeLook?.model_image_url && (
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">PNG</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Delete look */}
                                        {activeLook && (
                                            <button onClick={() => handleDeleteLook(activeLook.id, activeLook.model_image_url)}
                                                className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus look ini">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        )}

                                        <button onClick={goPrev} disabled={activeIndex === 0}
                                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
                                        </button>
                                        <div className="flex gap-1.5 flex-row-reverse">
                                            {looks.map((_, idx) => (
                                                <button key={idx} onClick={() => setActiveIndex(idx)}
                                                    className={`rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-gray-800 w-4 h-1.5' : 'bg-gray-300 hover:bg-gray-400 w-1.5 h-1.5'}`} />
                                            ))}
                                        </div>
                                        <button onClick={goNext} disabled={activeIndex === looks.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Product panel for active look */}
                            <div className="w-[260px] flex-shrink-0 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                        Produk ({activeLook?.items.length ?? 0})
                                    </p>
                                    <button onClick={() => setShowProductPicker(!showProductPicker)}
                                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                                        + Tambah
                                    </button>
                                </div>

                                {/* Product search */}
                                {showProductPicker && (
                                    <div className="relative">
                                        <input type="text" placeholder="Cari produk..." value={productSearch}
                                            onChange={(e) => searchProducts(e.target.value)} autoFocus
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                                        {productResults.length > 0 && activeLook && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                                {productResults.map((pv) => (
                                                    <button key={pv.id} onClick={() => handleLinkProduct(activeLook.id, pv.id)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center">
                                                        <span className="truncate">{pv.product_name} — {pv.name}</span>
                                                        <span className="text-xs text-gray-400 ml-2">{pv.sku}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchingProducts && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 p-3 text-sm text-gray-400 text-center">Mencari...</div>
                                        )}
                                    </div>
                                )}

                                {/* Product cards — matching customer page style */}
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                    {(!activeLook || activeLook.items.length === 0) ? (
                                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg py-10 text-center">
                                            <span className="material-symbols-outlined text-3xl text-gray-300 block mb-2">shopping_bag</span>
                                            <p className="text-xs text-gray-400">Belum ada produk</p>
                                            <p className="text-[10px] text-gray-300 mt-1">Klik "+ Tambah" untuk menghubungkan produk</p>
                                        </div>
                                    ) : (
                                        activeLook.items.map((item) => {
                                            const variant = item.product_variant;
                                            if (!variant) return null;
                                            return (
                                                <div key={item.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden group relative">
                                                    {/* Product image */}
                                                    <div className="aspect-square bg-gray-50 overflow-hidden p-3">
                                                        {(item.resolved_image_url || variant.product?.image_url) ? (
                                                            <img src={(item.resolved_image_url || variant.product?.image_url)!} alt={variant.name}
                                                                className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                <span className="material-symbols-outlined text-3xl">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="px-3 py-2">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 truncate">
                                                            {item.label || variant.name}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-[10px] text-gray-400">{variant.price !== null ? formatPrice(variant.price) : ''}</p>
                                                            <button onClick={() => handleUnlinkProduct(item.id)}
                                                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Hapus produk dari look">
                                                                <span className="material-symbols-outlined text-sm">close</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
