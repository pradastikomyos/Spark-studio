import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import ProductFormModal, { type CategoryOption, type ProductDraft } from '../../components/admin/ProductFormModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { getStockBadge, getStockBarColor } from '../../utils/statusHelpers';
import { uploadProductImage } from '../../utils/uploadProductImage';

type ProductVariantRow = {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  online_price: string | number | null;
  offline_price: string | number | null;
  stock: number | null;
  reserved_stock: number | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
};

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
  category_id: number;
  sku: string;
  type: 'fashion' | 'beauty' | 'other';
  is_active: boolean;
  deleted_at: string | null;
  categories?: { id: number; name: string; slug: string; is_active: boolean | null } | null;
  product_variants?: ProductVariantRow[] | null;
};

type InventoryProduct = {
  id: number;
  name: string;
  sku: string;
  type: ProductRow['type'];
  is_active: boolean;
  category: string;
  category_slug?: string;
  stock_available: number;
  stock_status: 'good' | 'ok' | 'low' | 'out';
  price_min: number;
  price_max: number;
  variant_count: number;
  image_url?: string | null;
};

const toNumber = (value: unknown, fallback: number = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const computeStockStatus = (stock: number): InventoryProduct['stock_status'] => {
  if (stock <= 0) return 'out';
  if (stock <= 10) return 'low';
  if (stock <= 30) return 'ok';
  return 'good';
};

const StoreInventory = () => {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [productsRaw, setProductsRaw] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<{ id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select(
            `
              id,
              name,
              slug,
              description,
              image_url,
              category_id,
              sku,
              type,
              is_active,
              deleted_at,
              categories(id, name, slug, is_active),
              product_variants(
                id,
                product_id,
                name,
                sku,
                online_price,
                offline_price,
                stock,
                reserved_stock,
                attributes,
                is_active
              )
            `
          )
          .is('deleted_at', null)
          .order('name', { ascending: true }),
        supabase
          .from('categories')
          .select('id, name, slug, is_active')
          .order('name', { ascending: true }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setProductsRaw((productsResult.data || []) as unknown as ProductRow[]);
      setCategories((categoriesResult.data || []) as unknown as CategoryOption[]);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      setProductsRaw([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleVerify = (code?: string) => {
    const value = (code ?? orderCode).trim();
    if (value) {
      alert(`Verifying order: ${value}`);
      setOrderCode('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const getStockLabel = (status: string) => {
    const labels = {
      good: 'Good',
      ok: 'Ok',
      low: 'Restock',
      out: 'Empty',
    };
    return labels[status as keyof typeof labels] || 'Unknown';
  };

  const getStockPercent = (stock: number, maxStock: number = 150) => {
    return Math.min((stock / maxStock) * 100, 100);
  };

  const inventoryProducts: InventoryProduct[] = useMemo(() => {
    return productsRaw.map((row) => {
      const variants = (row.product_variants || []).filter((v) => v.is_active !== false);
      const categoryName = row.categories?.name || 'Uncategorized';
      const categorySlug = row.categories?.slug;

      let stockAvailable = 0;
      let priceMin = Number.POSITIVE_INFINITY;
      let priceMax = 0;
      let imageUrl: string | null = row.image_url ?? null;

      for (const v of variants) {
        const stock = Math.max(toNumber(v.stock, 0) - toNumber(v.reserved_stock, 0), 0);
        stockAvailable += stock;
        const price = toNumber(v.online_price ?? v.offline_price, 0);
        priceMin = Math.min(priceMin, price);
        priceMax = Math.max(priceMax, price);
        if (!imageUrl) {
          const attrs = v.attributes || {};
          const maybeImage = typeof attrs.image_url === 'string' ? attrs.image_url : null;
          if (maybeImage) imageUrl = maybeImage;
        }
      }

      if (!Number.isFinite(priceMin)) priceMin = 0;

      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        type: row.type,
        is_active: row.is_active,
        category: categoryName,
        category_slug: categorySlug,
        stock_available: stockAvailable,
        stock_status: computeStockStatus(stockAvailable),
        price_min: priceMin,
        price_max: priceMax,
        variant_count: variants.length,
        image_url: imageUrl,
      };
    });
  }, [productsRaw]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();

    return inventoryProducts.filter((product) => {
      const matchesSearch =
        normalizedSearch === '' ||
        [product.name, product.category, product.sku].filter(Boolean).some((v) => v.toLowerCase().includes(normalizedSearch));

      const matchesCategory =
        normalizedCategoryFilter === '' ||
        product.category.toLowerCase().includes(normalizedCategoryFilter) ||
        (product.category_slug || '').toLowerCase().includes(normalizedCategoryFilter);

      const matchesStock =
        stockFilter === '' ||
        (stockFilter === 'in' && product.stock_status !== 'out') ||
        (stockFilter === 'low' && product.stock_status === 'low') ||
        (stockFilter === 'out' && product.stock_status === 'out');

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventoryProducts, searchQuery, categoryFilter, stockFilter]);

  const editingProduct = useMemo(() => {
    if (!editingProductId) return null;
    const row = productsRaw.find((p) => p.id === editingProductId);
    if (!row) return null;

    const variants = (row.product_variants || []).filter((v) => v.is_active !== false);
    const mapped = variants.map((v) => {
      const attrs = v.attributes || {};
      return {
        id: v.id,
        name: v.name,
        sku: v.sku,
        online_price: String(v.online_price ?? ''),
        offline_price: String(v.offline_price ?? ''),
        stock: toNumber(v.stock, 0),
        size: typeof attrs.size === 'string' ? attrs.size : '',
        color: typeof attrs.color === 'string' ? attrs.color : '',
      };
    });

    const initial: ProductDraft = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      category_id: row.category_id ?? null,
      type: row.type,
      sku: row.sku,
      is_active: row.is_active,
      variants: mapped.length ? mapped : [{ name: 'Default', sku: '', online_price: '', offline_price: '', stock: 0 }],
    };

    return initial;
  }, [editingProductId, productsRaw]);

  const handleOpenCreate = () => {
    setSaveError(null);
    setEditingProductId(null);
    setShowProductForm(true);
  };

  const handleOpenEdit = (productId: number) => {
    setSaveError(null);
    setEditingProductId(productId);
    setShowProductForm(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingProduct.id);
      if (error) throw error;
      setDeletingProduct(null);
      await fetchProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete product';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (payload: { draft: ProductDraft; imageFile: File | null }) => {
    const { draft, imageFile } = payload;
    setSaving(true);
    setSaveError(null);

    try {
      let productId = draft.id ?? null;

      if (!productId) {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: draft.name,
            slug: draft.slug,
            description: draft.description || null,
            category_id: draft.category_id,
            sku: draft.sku,
            type: draft.type,
            is_active: draft.is_active,
          })
          .select('id')
          .single();
        if (error || !data) throw error ?? new Error('Failed to create product');
        productId = Number(data.id);
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            name: draft.name,
            slug: draft.slug,
            description: draft.description || null,
            category_id: draft.category_id,
            sku: draft.sku,
            type: draft.type,
            is_active: draft.is_active,
          })
          .eq('id', productId);
        if (error) throw error;
      }

      const uploadedImageUrl = imageFile ? await uploadProductImage(imageFile, String(productId), { maxSizeMb: 2 }) : null;
      if (uploadedImageUrl) {
        const { error } = await supabase
          .from('products')
          .update({ image_url: uploadedImageUrl })
          .eq('id', productId);
        if (error) throw error;
      }

      const existingVariants = (productsRaw.find((p) => p.id === productId)?.product_variants || []).filter((v) => v.is_active !== false);
      const incomingIds = new Set<number>(draft.variants.flatMap((v) => (v.id ? [v.id] : [])));
      const removedIds = existingVariants.map((v) => v.id).filter((id) => !incomingIds.has(id));

      if (removedIds.length > 0) {
        const { error } = await supabase.from('product_variants').update({ is_active: false }).in('id', removedIds);
        if (error) throw error;
      }

      const updates = draft.variants.filter((v) => v.id);
      for (const v of updates) {
        const nextAttributes: Record<string, unknown> = {};
        if (v.size) nextAttributes.size = v.size;
        if (v.color) nextAttributes.color = v.color;

        const { error } = await supabase
          .from('product_variants')
          .update({
            name: v.name,
            sku: v.sku,
            online_price: v.online_price ? Number(v.online_price) : null,
            offline_price: v.offline_price ? Number(v.offline_price) : null,
            stock: v.stock,
            is_active: true,
            attributes: Object.keys(nextAttributes).length ? nextAttributes : null,
          })
          .eq('id', v.id as number);
        if (error) throw error;
      }

      const inserts = draft.variants.filter((v) => !v.id);
      if (inserts.length > 0) {
        const rows = inserts.map((v) => {
          const attributes: Record<string, unknown> = {};
          if (v.size) attributes.size = v.size;
          if (v.color) attributes.color = v.color;

          return {
            product_id: productId,
            name: v.name,
            sku: v.sku,
            online_price: v.online_price ? Number(v.online_price) : null,
            offline_price: v.offline_price ? Number(v.offline_price) : null,
            stock: v.stock,
            reserved_stock: 0,
            is_active: true,
            attributes: Object.keys(attributes).length ? attributes : null,
          };
        });

        const { error } = await supabase.from('product_variants').insert(rows);
        if (error) throw error;
      }

      setShowProductForm(false);
      setEditingProductId(null);
      await fetchProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save product';
      setSaveError(message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS.map(item => 
        item.id === 'orders' ? { ...item, filled: true } : item
      )}
      defaultActiveMenuId="orders"
      title="Store & Inventory"
      subtitle="Manage products, stock levels, and pickup verification."
      headerActions={
        <>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span>Stock Report</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Product</span>
          </button>
        </>
      }
      onLogout={signOut}
      mainClassName="relative"
    >
      <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div
            onClick={() => setShowScanner(true)}
            className="flex-1 p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 flex flex-col justify-center items-center bg-gray-50/50 dark:bg-white/5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <div className="h-24 w-24 rounded-lg border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-4 group-hover:border-primary group-hover:text-primary transition-all text-gray-400">
              <span className="material-symbols-outlined text-4xl">qr_code_scanner</span>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Click to Activate Camera</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">Scan customer pickup code instantly</p>
          </div>
          <div className="flex-1 p-8 flex flex-col justify-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Manual Verification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-sans mb-4">Enter the 8-digit order code if scanning fails.</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-sans uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                  placeholder="ORD-XXXX-XXXX"
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => handleVerify()}
                  className="rounded-lg bg-neutral-900 dark:bg-white px-6 py-2.5 text-sm font-bold text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
                >
                  Verify
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Scanner Ready</span>
              </div>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-sans">0 Pickups pending today</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Product Inventory</h3>
            <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:text-gray-400 font-sans">
              {filteredProducts.length} Items
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">search</span>
              <input
                className="w-full sm:w-64 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-sans"
                placeholder="Search products..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-sans cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-sans cursor-pointer"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="">Any Stock Status</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">inventory_2</span>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Products Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
              Try adjusting your search or filters, or add your first product to start tracking stock and pricing.
            </p>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Add Your First Product</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`group flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 ${
                  product.stock_status === 'out' ? 'opacity-75 hover:opacity-100' : ''
                }`}
              >
                <div className="aspect-[4/3] w-full bg-gray-100 dark:bg-white/5 relative overflow-hidden">
                  {product.image_url ? (
                    <img alt={product.name} src={product.image_url} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <span className="material-symbols-outlined text-6xl">inventory_2</span>
                    </div>
                  )}
                  {product.stock_status === 'out' && (
                    <div className="absolute top-0 right-0 bg-neutral-800 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                      SOLD OUT
                    </div>
                  )}
                  {product.stock_status === 'low' && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                      LOW STOCK
                    </div>
                  )}
                  <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEdit(product.id)}
                      className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-neutral-900 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingProduct({ id: product.id, name: product.name })}
                      className="rounded-lg bg-neutral-900/90 px-2 py-1 text-[10px] font-bold text-white hover:bg-neutral-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-neutral-900 dark:text-white leading-tight font-display">{product.name}</h4>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        ${product.price_min.toFixed(2)}
                        {product.price_max !== product.price_min ? `\u2013$${product.price_max.toFixed(2)}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">
                      {product.category} • {product.variant_count} variants
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400 font-mono">{product.sku}</p>
                    {!product.is_active && (
                      <p className="mt-1 text-[10px] font-bold text-yellow-500">INACTIVE</p>
                    )}
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className={`text-xs font-medium font-sans ${product.stock_status === 'low' ? 'text-primary' : product.stock_status === 'out' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {product.stock_available} in stock
                      </span>
                      {getStockBadge(product.stock_status, getStockLabel(product.stock_status))}
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStockBarColor(product.stock_status)} rounded-full`}
                        style={{ width: `${getStockPercent(product.stock_available)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {saveError && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {saveError}
        </div>
      )}

      <ProductFormModal
        isOpen={showProductForm}
        categories={categories}
        initialValue={editingProduct}
        onClose={() => {
          if (saving) return;
          setShowProductForm(false);
          setEditingProductId(null);
        }}
        onSave={handleSaveProduct}
      />

      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setDeletingProduct(null)}></div>
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-surface-dark p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold">Delete product?</h3>
            <p className="mt-2 text-sm text-gray-400">
              This will soft-delete <span className="font-bold text-white">{deletingProduct.name}</span>.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                disabled={saving}
                onClick={() => setDeletingProduct(null)}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleDelete}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <QRScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)}
        title="Scan Pickup Code"
        onScan={(decodedText) => {
          const normalized = decodedText.toUpperCase();
          setOrderCode(normalized);
          handleVerify(normalized);
          setShowScanner(false);
        }}
      />
    </AdminLayout>
  );
};

export default StoreInventory;
