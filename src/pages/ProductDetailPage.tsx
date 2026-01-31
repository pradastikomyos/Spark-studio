import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { useCart } from '../contexts/cartStore';
import { useProduct, type ProductDetail } from '../hooks/useProduct';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import { LazyMotion, m } from 'framer-motion';
import { ProductImageCarousel } from '../components/ProductImageCarousel';

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { data: product, error, isLoading, mutate } = useProduct(productId);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const loading = isLoading;

  useEffect(() => {
    if (!product) {
      setSelectedVariantId(null);
      setImageIndex(0);
      return;
    }
    const firstAvailable = product.variants.find((v) => v.available > 0) ?? product.variants[0] ?? null;
    setSelectedVariantId(firstAvailable ? firstAvailable.id : null);
    setImageIndex(0);
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product || selectedVariantId == null) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.available <= 0) return;
    const optimistic: ProductDetail = {
      ...product,
      variants: product.variants.map((variant) =>
        variant.id === selectedVariant.id
          ? { ...variant, available: Math.max(0, variant.available - 1) }
          : variant
      ),
    };
    mutate(optimistic, { revalidate: false, rollbackOnError: true });
    try {
      const fallbackImages = product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
      const imageFromCarousel = fallbackImages[imageIndex] ?? null;
      addItem(
        {
          productId: product.id,
          productName: product.name,
          productImageUrl: selectedVariant.imageUrl ?? imageFromCarousel ?? product.imageUrl,
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          unitPrice: selectedVariant.price,
        },
        1
      );
      showToast('success', 'Berhasil memasukkan ke keranjang');
    } catch {
      showToast('error', 'Gagal menambahkan ke keranjang');
      mutate();
    }
  };

  return (
    <PageTransition>
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
              {error instanceof Error ? error.message : 'Failed to load product'}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-surface-dark border border-gray-200 dark:border-gray-800 animate-pulse aspect-[4/5]" />
              <div className="flex flex-col gap-6">
                <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <ProductImageCarousel
                images={product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []}
                alt={product.name}
                onIndexChange={setImageIndex}
              />
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
                        {formatCurrency(selectedVariant ? selectedVariant.price : 0)}
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

                  <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
                    <m.button
                      onClick={handleAddToCart}
                      disabled={!selectedVariant || selectedVariant.available <= 0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-primary text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to Cart
                    </m.button>
                  </LazyMotion>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-5">
                  <h3 className="text-sm uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Pickup Info</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Barang bisa diambil di studio setelah pembayaran berhasil. Tunjukkan QR pickup di halaman order.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              Product not found.
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
