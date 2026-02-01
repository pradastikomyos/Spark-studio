import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../contexts/cartStore';
import { formatCurrency } from '../utils/formatters';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useBanners } from '../hooks/useBanners';
import { fetchProductDetail } from '../hooks/useProduct';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';
import { queryKeys } from '../lib/queryKeys';

const Fashion = () => {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  const { data: products = [], error: productsError, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
  const { data: fashionBanners = [], isLoading: bannersLoading } = useBanners('fashion');

  // Combine loading and error states
  const loading = productsLoading || categoriesLoading || bannersLoading;
  const error = productsError || categoriesError;

  // Filter out cosmetic category for fashion page
  const fashionCategories = useMemo(() => {
    return categories.filter((cat) => cat.slug !== 'cosmetic');
  }, [categories]);

  // Show error toast when data fetching fails (only once per error)
  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load shop data');
    }
  }, [error, showToast]);

  // Auto-advance hero slider every 5 seconds
  useEffect(() => {
    if (fashionBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % fashionBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [fashionBanners.length]);

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % fashionBanners.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + fashionBanners.length) % fashionBanners.length);
  };

  const filteredProducts = useMemo(() => {
    // Exclude cosmetic products from fashion page
    const nonCosmeticProducts = products.filter((p) => p.categorySlug !== 'cosmetic');
    if (activeCategory === 'all') return nonCosmeticProducts;
    return nonCosmeticProducts.filter((p) => p.categorySlug === activeCategory);
  }, [products, activeCategory]);

  // const features = [
  //   { icon: 'check', text: 'Premium Organic Materials' },
  //   { icon: 'check', text: 'Ethically Manufactured' },
  //   { icon: 'check', text: 'Designed in-house by Spark Artists' },
  // ];

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
          {fashionBanners.length > 0 ? (
            <>
              {/* Hero Slides */}
              <div className="relative h-full">
                {fashionBanners.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {/* Background Image */}
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="w-full h-full object-cover object-center opacity-90"
                    />
                    <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>

                    {/* Hero Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium mb-4 animate-fade-in">
                        Fall / Winter 2025
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

              {/* Hero Navigation Buttons */}
              {fashionBanners.length > 1 && (
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

                  {/* Hero Indicators */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                    {fashionBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentHeroSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          currentHeroSlide === index ? 'bg-primary w-8' : 'bg-white/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            // Fallback to static banner if no banners in database
            <>
              <img
                alt="Soft artistic studio setting"
                className="w-full h-full object-cover object-center opacity-90"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
              />
              <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium mb-4">
                  Fall / Winter 2025
                </span>
                <h1 className="font-display text-5xl md:text-7xl text-text-light font-medium mb-6">
                  The Red Collection
                </h1>
                <p className="text-subtext-light text-lg max-w-lg font-light mb-8">
                  Curated apparel and accessories for the modern creative. Defined by bold lines and signature hues.
                </p>
              </div>
            </>
          )}
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-gray-100 pb-6 sticky top-0 bg-white z-50 pt-6 -mt-6 transition-all">
            <div className="flex space-x-8 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              <button
                key="all"
                onClick={() => setActiveCategory('all')}
                className={`text-sm whitespace-nowrap transition-colors ${activeCategory === 'all'
                  ? 'font-medium text-primary border-b border-primary pb-0.5'
                  : 'font-light text-subtext-light hover:text-primary'
                  }`}
              >
                All Products
              </button>
              {fashionCategories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => setActiveCategory(category.slug)}
                  className={`text-sm whitespace-nowrap transition-colors ${activeCategory === category.slug
                    ? 'font-medium text-primary border-b border-primary pb-0.5'
                    : 'font-light text-subtext-light hover:text-primary'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto justify-end">
              <span className="text-xs text-subtext-light uppercase tracking-widest">
                Sort By:
              </span>
              <select className="text-sm font-light text-text-light bg-transparent border-none focus:ring-0 cursor-pointer pr-8 py-0">
                <option>Featured</option>
                <option>Newest</option>
                <option>Price: Low to High</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {error && (
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Failed to load shop data'}
              </p>
              <button
                onClick={() => {
                  refetchProducts();
                  refetchCategories();
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              {/* Show 8 skeleton cards during loading */}
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/fashion/product/${product.id}`}
                  className="group cursor-pointer"
                  onMouseEnter={() => prefetchProduct(product.id)}
                >
                  <div className="relative overflow-hidden aspect-[3/4] rounded-sm bg-gray-50 mb-4">
                    {product.image ? (
                      <img
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={product.image}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                        <span className="material-symbols-outlined text-6xl">{product.placeholder}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300"></div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={!product.defaultVariantId}
                      className="absolute bottom-4 right-4 bg-[#D32F2F] text-white p-2 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-md hover:bg-[#B71C1C] disabled:opacity-50 disabled:hover:bg-[#D32F2F] disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                    </button>
                    {product.badge && (
                      <span className="absolute top-4 left-4 bg-white text-primary px-2 py-1 text-[10px] uppercase tracking-widest font-bold shadow-sm">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-text-light mb-1 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-subtext-light mb-2">{product.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-subtext-light line-through">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Load More Button */}
          <div className="flex justify-center mt-20">
            <button className="px-8 py-3 border border-primary text-primary hover:bg-[#D32F2F] hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase rounded-sm font-medium">
              Load More Products
            </button>
          </div>
        </main>

        {/* Feature Section
        <section className="bg-gray-50 py-24 my-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <img
                  alt="Model wearing Spark Stage apparel"
                  className="rounded-sm shadow-xl w-full h-[500px] object-cover grayscale"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg"
                />
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <h2 className="font-display text-4xl text-text-light">
                  <span className="italic text-primary">Details</span>.
                </h2>
                <p className="text-subtext-light font-light leading-relaxed">
                  Our apparel collection is designed to be lived in. Soft fabrics, relaxed cuts, and minimalist branding that speaks to the creative soul. Each piece is crafted with care, ensuring you look as good as you feel.
                </p>
                <ul className="space-y-4 mt-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary font-light">{feature.icon}</span>
                      <span className="text-sm font-light text-text-light">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-6">
                  <a
                    className="text-sm font-medium uppercase tracking-widest border-b border-primary pb-1 hover:text-primary transition-colors"
                    href="#"
                  >
                    Read Our Story
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* Newsletter Section
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <span className="material-symbols-outlined text-4xl text-primary mb-4 inline-block">mail</span>
          <h2 className="font-display text-3xl font-medium mb-3 text-text-light">
            Join the Spark Club
          </h2>
          <p className="text-subtext-light font-light mb-8">
            Receive early access to new drops, exclusive offers, and inspiration directly to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              className="flex-grow px-4 py-3 bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-sm outline-none transition-all placeholder:font-light placeholder:text-gray-400 font-light text-text-light"
              placeholder="Your email address"
              required
              type="email"
            />
            <button
              className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-8 py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20"
              type="submit"
            >
              Subscribe
            </button>
          </form>
        </section> */}
      </div>
    </PageTransition>
  );
};

export default Fashion;
