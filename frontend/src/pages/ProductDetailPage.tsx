import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { useCart } from '../contexts/cartStore';
import { useProduct, type ProductDetail } from '../hooks/useProduct';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import { LazyMotion, m, AnimatePresence } from 'framer-motion';
import { ProductImageCarousel } from '../components/ProductImageCarousel';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { ShoppingBag, ChevronLeft, ShieldCheck, Truck } from 'lucide-react';

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

    // Optimistic Update
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
      showToast('success', 'Added to shopping bag');
    } catch {
      showToast('error', 'Failed to add to cart');
      if (queryKey) queryClient.setQueryData(queryKey, previous);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 w-full">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#e63d75] transition-colors text-sm font-medium uppercase tracking-widest group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Shop
            </Link>
          </div>

          {error && (
            <div className="mb-12 rounded-xl border border-red-500/20 bg-red-50 p-6 text-center">
              <p className="text-red-600 font-medium">{error instanceof Error ? error.message : 'Failed to load product'}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              <div className="rounded-3xl overflow-hidden bg-gray-100 animate-pulse aspect-[4/5]" />
              <div className="flex flex-col gap-8 pt-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-12 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-3 pt-8">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
              {/* Product Gallery */}
              <div>
                <div className="sticky top-28">
                  <ProductImageCarousel
                    images={product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []}
                    alt={product.name}
                    onIndexChange={setImageIndex}
                  />

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-[#e63d75]">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">Original</p>
                        <p className="text-xs text-gray-500">100% Authentic</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-[#e63d75]">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">Store Pickup</p>
                        <p className="text-xs text-gray-500">Pick up at studio</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-2">
                <div className="mb-8 border-b border-gray-100 pb-8">
                  <div className="flex items-center gap-2 mb-4">
                    {product.categoryName && (
                      <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-sm">
                        {product.categoryName}
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-[1.1] mb-6">
                    {product.name}
                  </h1>

                  <p className="text-lg text-gray-500 leading-relaxed font-light font-sans max-w-xl">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Price */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#e63d75] font-bold mb-2">Price</p>
                    <p className="font-serif text-4xl text-gray-900">
                      {formatCurrency(selectedVariant ? selectedVariant.price : 0)}
                    </p>
                  </div>

                  {/* Variants */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Select Variant</p>
                      {selectedVariant && (
                        <span className={`text-xs font-medium ${selectedVariant.available < 5 ? 'text-red-500' : 'text-green-600'}`}>
                          {selectedVariant.available > 0
                            ? `${selectedVariant.available} items left`
                            : 'Out of Stock'}
                        </span>
                      )}
                    </div>

                    {product.variants.length < 6 ? (
                      <div className="flex flex-wrap gap-3">
                        {product.variants.map((variant) => {
                          const isSelected = selectedVariantId === variant.id;
                          const isDisabled = variant.available <= 0;
                          return (
                            <button
                              key={variant.id}
                              onClick={() => setSelectedVariantId(variant.id)}
                              disabled={isDisabled}
                              className={`
                                min-w-[3rem] px-4 py-3 rounded-lg text-sm font-medium border transition-all relative overflow-hidden
                                ${isSelected
                                  ? 'border-[#e63d75] bg-[#e63d75] text-white shadow-lg shadow-pink-200'
                                  : isDisabled
                                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed decoration-slice'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }
                              `}
                            >
                              {variant.name}
                              {isDisabled && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-full h-[1px] bg-gray-300 -rotate-45" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedVariantId ?? ''}
                          onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-5 py-4 text-gray-900 outline-none focus:border-[#e63d75] focus:ring-1 focus:ring-[#e63d75] transition-all cursor-pointer"
                        >
                          {product.variants.length === 0 && <option value="">No variants available</option>}
                          {product.variants.map((variant) => (
                            <option key={variant.id} value={variant.id} disabled={variant.available <= 0}>
                              {variant.name} {variant.available <= 0 ? '(Out of Stock)' : ''}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
                    <AnimatePresence>
                      <div className="pt-4">
                        <m.button
                          onClick={handleAddToCart}
                          disabled={!selectedVariant || selectedVariant.available <= 0}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-[#e63d75] text-white py-5 rounded-xl uppercase tracking-widest text-sm font-bold shadow-xl shadow-pink-200 hover:bg-[#cc2f64] hover:shadow-pink-300 active:bg-[#a32550] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 disabled:bg-gray-400"
                        >
                          <ShoppingBag className="w-5 h-5" />
                          {!selectedVariant || selectedVariant.available <= 0 ? (
                            'Out of Stock'
                          ) : (
                            'Add to Shopping Bag'
                          )}
                        </m.button>

                        {!selectedVariant || selectedVariant.available <= 0 ? (
                          <m.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-xs text-gray-400 mt-4 uppercase tracking-wider"
                          >
                            Please select an available variant
                          </m.p>
                        ) : (
                          <p className="text-center text-xs text-gray-400 mt-4">
                            Free pickup at Spark Studio • Secure Payment
                          </p>
                        )}
                      </div>
                    </AnimatePresence>
                  </LazyMotion>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="font-serif text-3xl text-gray-900 mb-2">Product Not Found</h2>
              <p className="text-gray-500 mb-8">The product you are looking for might have been removed or is unavailable.</p>
              <Link
                to="/shop"
                className="bg-gray-900 text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
              >
                Browse Collection
              </Link>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
