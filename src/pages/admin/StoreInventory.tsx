import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { getStockBadge, getStockBarColor } from '../../utils/statusHelpers';

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  category_slug?: string;
  variant: string;
  stock: number;
  stock_status: 'good' | 'ok' | 'low' | 'out';
  icon?: string;
};

type ProductVariantRow = {
  id: string | number;
  name: string;
  online_price: string | number;
  offline_price: string | number;
  stock: number;
  reserved_stock: number;
};

type ProductRow = {
  id: string | number;
  name: string;
  type?: string;
  categories?: { name: string; slug: string } | null;
  product_variants?: ProductVariantRow[] | null;
};

const toNumber = (value: unknown, fallback: number = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const randomId = () => {
  const maybeCrypto = globalThis.crypto;
  if (maybeCrypto && 'randomUUID' in maybeCrypto && typeof maybeCrypto.randomUUID === 'function') {
    return maybeCrypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toIdString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return randomId();
};

const computeStockStatus = (stock: number): Product['stock_status'] => {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      if (!supabase) {
        setProducts([]);
        return;
      }

      const { data: productsData, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          type,
          categories(name, slug),
          product_variants(
            id,
            name,
            online_price,
            offline_price,
            stock,
            reserved_stock
          )
        `
        )
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        const rows = (productsData || []) as unknown as ProductRow[];
        const flattened: Product[] = rows.flatMap((row) => {
          const productId = toIdString(row.id);
          const categoryName = row.categories?.name || 'Uncategorized';
          const categorySlug = row.categories?.slug;
          const variants = row.product_variants || [];

          if (variants.length === 0) {
            return [
              {
                id: productId,
                name: row.name,
                price: 0,
                category: categoryName,
                category_slug: categorySlug,
                variant: 'Default',
                stock: 0,
                stock_status: 'out',
              },
            ];
          }

          return variants.map((variant) => {
            const variantId = toIdString(variant.id);
            const stock = Math.max(
              toNumber(variant.stock, 0) - toNumber(variant.reserved_stock, 0),
              0
            );
            const price = toNumber(variant.online_price ?? variant.offline_price, 0);

            return {
              id: `${productId}-${variantId}`,
              name: row.name,
              price,
              category: categoryName,
              category_slug: categorySlug,
              variant: variant.name,
              stock,
              stock_status: computeStockStatus(stock),
            };
          });
        });

        setProducts(flattened);
      }
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      setProducts([]);
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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      normalizedSearch === '' ||
      [product.name, product.category, product.variant]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(normalizedSearch));

    const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
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
          <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-md">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Product</span>
          </button>
        </>
      }
      onLogout={signOut}
      mainClassName="relative"
    >
      {!supabase ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="text-sm font-bold">Supabase belum terkonfigurasi.</p>
          <p className="mt-1 text-sm opacity-90">
            Set <span className="font-mono">VITE_SUPABASE_URL</span> dan <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> di Environment Variables Vercel, lalu redeploy.
          </p>
        </div>
      ) : null}
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
              <option value="apparel">Apparel</option>
              <option value="accessories">Accessories</option>
              <option value="prints">Prints</option>
              <option value="digital">Digital</option>
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
            <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-md">
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
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <span className="material-symbols-outlined text-6xl">{product.icon || 'inventory_2'}</span>
                  </div>
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
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-neutral-900 dark:text-white leading-tight font-display">{product.name}</h4>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">${Number(product.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">
                      {product.category} • {product.variant}
                    </p>
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className={`text-xs font-medium font-sans ${product.stock_status === 'low' ? 'text-primary' : product.stock_status === 'out' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {product.stock} in stock
                      </span>
                      {getStockBadge(product.stock_status, getStockLabel(product.stock_status))}
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStockBarColor(product.stock_status)} rounded-full`}
                        style={{ width: `${getStockPercent(product.stock)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
