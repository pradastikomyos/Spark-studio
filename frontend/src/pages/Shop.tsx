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

const Shop = () => {
    const queryClient = useQueryClient();
    const { addItem } = useCart();
    const { showToast } = useToast();
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

    const { data: products = [], error: productsError, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
    const { data: categories = [], error: categoriesError, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
    // Using shop banners
    const { data: shopBanners = [], isLoading: bannersLoading } = useBanners('shop');

    // Combine loading and error states
    const loading = productsLoading || categoriesLoading || bannersLoading;
    const error = productsError || categoriesError;

    // Show error toast when data fetching fails (only once per error)
    useEffect(() => {
        if (error) {
            showToast('error', error instanceof Error ? error.message : 'Failed to load shop data');
        }
    }, [error, showToast]);

    // Auto-advance hero slider every 5 seconds
    useEffect(() => {
        if (shopBanners.length === 0) return;
        const timer = setInterval(() => {
            setCurrentHeroSlide((prev) => (prev + 1) % shopBanners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [shopBanners.length]);

    const nextHeroSlide = () => {
        setCurrentHeroSlide((prev) => (prev + 1) % shopBanners.length);
    };

    const prevHeroSlide = () => {
        setCurrentHeroSlide((prev) => (prev - 1 + shopBanners.length) % shopBanners.length);
    };

    const filteredProducts = useMemo(() => {
        if (activeCategory === 'all') return products;
        return products.filter((p) => p.categorySlug === activeCategory);
    }, [products, activeCategory]);

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
                    {shopBanners.length > 0 ? (
                        <>
                            {/* Hero Slides */}
                            <div className="relative h-full">
                                {shopBanners.map((slide, index) => (
                                    <div
                                        key={slide.id}
                                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
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
                            {shopBanners.length > 1 && (
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
                                        {shopBanners.map((_, index) => (
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
                                    The Collection
                                </h1>
                                <p className="text-subtext-light text-lg max-w-lg font-light mb-8">
                                    Curated apparel, accessories, and beauty essentials for the modern creative.
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
                            {categories.map((category) => (
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
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/shop/product/${product.id}`}
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

                    {/* Load More Button */}
                    <div className="flex justify-center mt-20">
                        <button className="px-8 py-3 border border-primary text-primary hover:bg-[#ff4b86] hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase rounded-sm font-medium">
                            Load More Products
                        </button>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
};

export default Shop;
