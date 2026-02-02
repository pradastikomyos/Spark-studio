import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../contexts/cartStore';
import { formatCurrency } from '../utils/formatters';
import { useProducts } from '../hooks/useProducts';
import { useBanners } from '../hooks/useBanners';
import { fetchProductDetail } from '../hooks/useProduct';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';
import { queryKeys } from '../lib/queryKeys';

const Beauty = () => {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  const { data: products = [], error: productsError, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const { data: beautyBanners = [], isLoading: bannersLoading } = useBanners('beauty');

  const loading = productsLoading || bannersLoading;
  const error = productsError;

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load beauty products');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (beautyBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % beautyBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [beautyBanners.length]);

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % beautyBanners.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + beautyBanners.length) % beautyBanners.length);
  };

  // Filter only cosmetic products
  const cosmeticProducts = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'cosmetic');
  }, [products]);

  const handleAddToCart = (product: typeof products[0]) => {
    if (!product.defaultVariantId || !product.defaultVariantName) return;
    try {
      addItem(
        {
          productId: product.id,
          productName: product.name,
          productImageUrl: product.image,
          variantId: product.defaultVariantId,
          variantName: product.defaultVariantName,
          unitPrice: product.price,
        },
        1
      );
      showToast('success', 'Berhasil memasukkan ke keranjang');
    } catch {
      showToast('error', 'Gagal menambahkan ke keranjang');
    }
  };

  const prefetchProduct = (productId: number) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.product(productId),
      queryFn: ({ signal }) => fetchProductDetail(productId, signal),
      staleTime: 60000,
    });
  };

  return (
    <PageTransition>
      <div className="bg-white min-h-screen">
        {/* Hero Header with Slider */}
        <header className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
          {beautyBanners.length > 0 ? (
            <>
              <div className="relative h-full">
                {beautyBanners.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="w-full h-full object-cover object-center opacity-90"
                    />
                    <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium mb-4 animate-fade-in">
                        Beauty Collection
                      </span>
                      <h1 className="font-display text-5xl md:text-7xl text-text-light font-medium mb-6 animate-fade-in">
                        {slide.title}
                      </h1>
                      {slide.subtitle && (
                        <p className="text-subtext-light text-lg max-w-lg font-light mb-8 animate-fade-in-delay">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {beautyBanners.length > 1 && (
                <>
                  <button
                    onClick={prevHeroSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full transition-all"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextHeroSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full transition-all"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                    {beautyBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentHeroSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${currentHeroSlide === index ? 'bg-primary w-8' : 'bg-white/50'
                          }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <img
                alt="Beauty products"
                className="w-full h-full object-cover object-center opacity-90"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg"
              />
              <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium mb-4">
                  Beauty Collection
                </span>
                <h1 className="font-display text-5xl md:text-7xl text-text-light font-medium mb-6">
                  Cosmetics & Beauty
                </h1>
                <p className="text-subtext-light text-lg max-w-lg font-light mb-8">
                  Premium cosmetics and beauty products for the modern creative.
                </p>
              </div>
            </>
          )}
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h2 className="text-2xl font-display font-semibold text-text-light mb-2">Cosmetic Products</h2>
            <p className="text-subtext-light">Discover our curated selection of premium beauty products</p>
          </div>

          {error && (
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Failed to load beauty products'}
              </p>
              <button
                onClick={() => refetchProducts()}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : cosmeticProducts.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_bag</span>
              <p className="text-gray-500">No cosmetic products available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cosmeticProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/beauty/product/${product.id}`}
                  className="group cursor-pointer"
                  onMouseEnter={() => prefetchProduct(product.id)}
                >
                  <div className="rounded-xl border-2 border-gray-100 hover:border-[#ff4b86] bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-pink-100">
                    {/* Product Image */}
                    <div className="relative overflow-hidden aspect-square bg-gray-50">
                      {product.image ? (
                        <img
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          src={product.image}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                          <span className="material-symbols-outlined text-5xl">{product.placeholder}</span>
                        </div>
                      )}
                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={!product.defaultVariantId}
                        className="absolute bottom-3 right-3 bg-[#ff4b86] text-white p-2.5 rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg hover:bg-[#e63d75] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                      </button>
                      {/* Badge */}
                      {product.badge && (
                        <span className="absolute top-3 left-3 bg-[#ff4b86] text-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    {/* Product Info */}
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-[#ff4b86] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 font-light">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#ff4b86]">{formatCurrency(product.price)}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-gray-400 line-through font-light">
                            {formatCurrency(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default Beauty;
