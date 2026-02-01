import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { useCart } from '../contexts/cartStore';
import { useProduct, type ProductDetail } from '../hooks/useProduct';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import { LazyMotion, m } from 'framer-motion';
import { ProductImageCarousel } from '../components/ProductImageCarousel';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: product, error, isLoading } = useProduct(productId);
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
    const numericId = Number(productId);
    const queryKey = Number.isFinite(numericId) ? queryKeys.product(numericId) : null;
    const previous = queryKey ? queryClient.getQueryData<ProductDetail | null>(queryKey) : null;
    const optimistic: ProductDetail = {
      ...product,
      variants: product.variants.map((variant) =>
        variant.id === selectedVariant.id
          ? { ...variant, available: Math.max(0, variant.available - 1) }
          : variant
      ),
    };
    if (queryKey) queryClient.setQueryData(queryKey, optimistic);
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
      if (queryKey) queryClient.setQueryData(queryKey, previous);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-light">
        <main className="max-w-6xl mx-auto px-6 lg:px-12 py-16 w-full">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-light">Product Detail</h1>
              <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest">Buy Online, Pick Up In Store</p>
            </div>
            <Link
              to="/fashion"
              className="text-primary hover:text-white hover:bg-primary border border-primary px-6 py-2 text-sm uppercase tracking-widest transition-all duration-300"
            >
              Back to Shop
            </Link>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to load product'}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 animate-pulse aspect-[4/5]" />
              <div className="flex flex-col gap-6">
                <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-48 bg-gray-200 rounded animate-pulse" />
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
                  <h2 className="font-display text-3xl text-text-light">{product.name}</h2>
                  <p className="mt-3 text-sm text-subtext-light leading-relaxed">{product.description}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500">Price</p>
                      <p className="text-2xl font-display text-primary">
                        {formatCurrency(selectedVariant ? selectedVariant.price : 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-500">Stock</p>
                      <p className="text-sm font-semibold text-text-light">
                        {selectedVariant ? (selectedVariant.available > 0 ? `${selectedVariant.available} tersedia` : 'Habis') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Variant</label>
                    <select
                      value={selectedVariantId ?? ''}
                      onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                      className="w-full bg-[#D32F2F] text-white py-4 rounded-lg uppercase tracking-widest text-sm font-bold hover:bg-[#B71C1C] active:bg-[#8B0000] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D32F2F]"
                    >
                      Add to Cart
                    </m.button>
                  </LazyMotion>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white/50 p-5">
                  <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Pickup Info</h3>
                  <p className="text-sm text-gray-600">
                    Barang bisa diambil di studio setelah pembayaran berhasil. Tunjukkan QR pickup di halaman order.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              Product not found.
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
