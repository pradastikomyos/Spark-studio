import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/cartStore';

type Variant = {
  id: number;
  name: string;
  price: number;
  available: number;
  imageUrl?: string;
};

type ProductDetail = {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  variants: Variant[];
};

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const numericId = Number(productId);
        if (!Number.isFinite(numericId)) {
          setError('Product not found');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('products')
          .select(
            `
            id,
            name,
            description,
            image_url,
            product_variants(id, name, online_price, offline_price, attributes, is_active, stock, reserved_stock)
          `
          )
          .eq('id', numericId)
          .single();

        if (fetchError || !data) throw fetchError ?? new Error('Product not found');

        const productImage = (data as { image_url?: string | null }).image_url ?? null;
        const variants = ((data as { product_variants?: unknown[] }).product_variants || []) as {
          id: number;
          name: string;
          online_price: string | number | null;
          offline_price: string | number | null;
          attributes: Record<string, unknown> | null;
          is_active: boolean | null;
          stock: number | null;
          reserved_stock: number | null;
        }[];

        const mappedVariants: Variant[] = variants
          .filter((v) => v.is_active !== false)
          .map((v) => {
            const price = typeof v.online_price === 'number' ? v.online_price : Number(v.online_price ?? v.offline_price ?? 0);
            const available = Math.max(0, (v.stock ?? 0) - (v.reserved_stock ?? 0));
            const imageUrl = typeof v.attributes?.image_url === 'string' ? v.attributes.image_url : undefined;
            return {
              id: Number(v.id),
              name: String(v.name),
              price: Number.isFinite(price) ? price : 0,
              available,
              imageUrl: imageUrl ?? productImage ?? undefined,
            };
          });

        const firstAvailable = mappedVariants.find((v) => v.available > 0) ?? mappedVariants[0] ?? null;
        setSelectedVariantId(firstAvailable ? firstAvailable.id : null);

        setProduct({
          id: Number((data as { id: number | string }).id),
          name: String((data as { name: string }).name),
          description: String((data as { description?: string | null }).description ?? ''),
          imageUrl: productImage ?? undefined,
          variants: mappedVariants,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load product');
        setProduct(null);
        setSelectedVariantId(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [productId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedVariant = useMemo(() => {
    if (!product || selectedVariantId == null) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.available <= 0) return;
    addItem(
      {
        productId: product.id,
        productName: product.name,
        productImageUrl: selectedVariant.imageUrl ?? product.imageUrl,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        unitPrice: selectedVariant.price,
      },
      1
    );
    setToast('Berhasil memasukkan ke keranjang');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-16 w-full">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-light">Product Detail</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">Buy Online, Pick Up In Store</p>
          </div>
          <Link
            to="/shop"
            className="text-primary hover:text-white hover:bg-primary border border-primary px-6 py-2 text-sm uppercase tracking-widest transition-all duration-300"
          >
            Back to Shop
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading product...</p>
            </div>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-surface-dark border border-gray-200 dark:border-gray-800">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="aspect-[4/5] w-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <span className="material-symbols-outlined text-6xl">inventory_2</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-3xl text-text-light dark:text-text-dark">{product.name}</h2>
                <p className="mt-3 text-sm text-subtext-light dark:text-subtext-dark leading-relaxed">{product.description}</p>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Price</p>
                    <p className="text-2xl font-display text-primary">
                      ${selectedVariant ? selectedVariant.price.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Stock</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {selectedVariant ? (selectedVariant.available > 0 ? `${selectedVariant.available} tersedia` : 'Habis') : '-'}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Variant</label>
                  <select
                    value={selectedVariantId ?? ''}
                    onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {product.variants.length === 0 && <option value="">No variants</option>}
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id} disabled={variant.available <= 0}>
                        {variant.name} {variant.available > 0 ? '' : '(Habis)'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.available <= 0}
                  className="w-full bg-primary text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-5">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Pickup Info</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Barang bisa diambil di studio setelah pembayaran berhasil. Tunjukkan QR pickup di halaman order.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-black text-white px-5 py-3 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
