import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../contexts/cartStore';
import { useAuth } from '../contexts/AuthContext';

import { formatCurrency } from '../utils/formatters';
import { useProductSummaries, type Product } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useBanners } from '../hooks/useBanners';
import { fetchProductDetail } from '../hooks/useProduct';
import { useCharmBarSettings } from '../hooks/useCharmBarSettings';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';
import { queryKeys } from '../lib/queryKeys';
import { HeroBannerCarousel } from '../components/HeroBannerCarousel';
import { buildShopCategoryIndex } from './shop/buildShopCategoryIndex';
import { filterShopProducts } from './shop/filterShopProducts';
import { useShopFilters } from './shop/useShopFilters';

const PRODUCTS_PER_PAGE = 20;

type ShopResultsProps = {
  filteredProducts: Product[];
  loading: boolean;
  resetSignal: string;
  onPrefetchProduct: (productId: number) => void;
  onAddToCart: (product: Product) => void;
};

function ShopResults({ filteredProducts, loading, resetSignal, onPrefetchProduct, onAddToCart }: ShopResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetSignal]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, page]);

  if (loading) {
    const skeletonKeys = ['product-skeleton-1', 'product-skeleton-2', 'product-skeleton-3', 'product-skeleton-4', 'product-skeleton-5', 'product-skeleton-6', 'product-skeleton-7', 'product-skeleton-8', 'product-skeleton-9', 'product-skeleton-10'];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {skeletonKeys.map((skeletonKey) => (
          <ProductCardSkeleton key={skeletonKey} />
        ))}
      </div>
    );
  }

  return (
    <>
      {totalProducts === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No products found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedProducts.map((product) => (
            <Link
              key={product.id}
              to={`/shop/product/${product.id}`}
              className="group cursor-pointer"
              onMouseEnter={() => onPrefetchProduct(product.id)}
            >
              <div className="rounded-xl border-2 border-gray-100 bg-white overflow-hidden duration-300 ux-transition-color hover:border-[#ff4b86] hover:shadow-lg hover:shadow-pink-100">
                <div className="relative overflow-hidden aspect-square bg-gray-50">
                  {product.image ? (
                    <img
                      alt={product.name}
                      className="w-full h-full object-cover duration-500 ux-transition-transform ux-motion-safe group-hover:scale-[1.03]"
                      src={product.image}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-5xl">{product.placeholder}</span>
                    </div>
                  )}
                  {!product.defaultVariantId && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold uppercase tracking-widest px-3 py-1 border border-white/50 bg-black/20 backdrop-blur-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    disabled={!product.defaultVariantId}
                    className="absolute bottom-3 right-3 bg-[#ff4b86] text-white p-2.5 rounded-full opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 shadow-lg hover:bg-[#e63d75] ux-transition-color ux-transition-opacity ux-transition-transform ux-motion-safe disabled:opacity-0 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                  </button>
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-[#ff4b86] text-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 ux-transition-color group-hover:text-[#ff4b86]">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 font-light">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#ff4b86]">{formatCurrency(product.price)}</span>
                    {product.originalPrice ? (
                      <span className="text-xs text-gray-400 line-through font-light">
                        {formatCurrency(product.originalPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalProducts > 0 ? (
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({totalProducts} products)
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev - 1)))}
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 duration-200 ux-transition-color hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 duration-200 ux-transition-color hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const Shop = () => {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    activeCategory,
    activeSubcategory,
    activeSubSubcategory,
    searchQuery,
    setSearchQuery,
    updateFilters,
    deferredSearchQuery,
    resultsResetSignal,
  } = useShopFilters();

  const { data: products = [], error: productsError, isLoading: productsLoading, refetch: refetchProducts } = useProductSummaries();
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
  const { data: shopBanners = [] } = useBanners('shop');
  const { settings: charmBarSettings, isLoading: charmBarLoading } = useCharmBarSettings();

  const loading = (productsLoading || categoriesLoading || charmBarLoading) && products.length === 0;
  const error = productsError || categoriesError;

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load shop data');
    }
  }, [error, showToast]);

  const { parentCategories, childCategoriesByParentSlug, allowedSlugMap } = useMemo(
    () => buildShopCategoryIndex(categories),
    [categories]
  );

  const filteredProducts = useMemo(
    () =>
      filterShopProducts({
        products,
        activeCategory,
        activeSubcategory,
        activeSubSubcategory,
        searchQuery: deferredSearchQuery,
        allowedSlugMap,
        bestSellerIds: charmBarSettings?.best_seller_charms || [],
      }),
    [products, activeCategory, activeSubcategory, activeSubSubcategory, deferredSearchQuery, allowedSlugMap, charmBarSettings]
  );

  const activeSubcategories = useMemo(() => {
    if (activeCategory === 'all') return [];
    return childCategoriesByParentSlug.get(activeCategory) ?? [];
  }, [activeCategory, childCategoriesByParentSlug]);

  const activeSubSubcategories = useMemo(() => {
    if (activeSubcategory === 'all') return [];
    return childCategoriesByParentSlug.get(activeSubcategory) ?? [];
  }, [activeSubcategory, childCategoriesByParentSlug]);

  const handleAddToCart = (product: Product) => {
    if (!user) {
      showToast('error', 'Please login to add items to cart');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
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
        <header className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
          {shopBanners.length > 0 ? (
            <HeroBannerCarousel
              slides={shopBanners}
              intervalMs={5000}
              containerClassName="relative h-full"
              imageClassName="w-full h-full object-cover object-center opacity-90"
              prevButtonClassName="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full ux-transition-color"
              nextButtonClassName="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full ux-transition-color"
              indicatorActiveClassName="bg-primary"
              indicatorInactiveClassName="bg-white/50 hover:bg-white/70"
            />
          ) : (
            <>
              <img
                alt="Soft artistic studio setting"
                className="w-full h-full object-cover object-center opacity-90"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
              />
            </>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="mb-8 border-b border-gray-100 pb-0 sticky top-0 bg-white z-40 pt-4 -mt-6">
            <div className="flex flex-col space-y-4">
              <div className="relative w-full max-w-md mx-auto mb-2 px-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      updateFilters({ q: e.target.value });
                    }}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        updateFilters({ q: null });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 ux-transition-color"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex space-x-6 overflow-x-auto w-full pb-0 hide-scrollbar px-2 justify-center md:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    updateFilters({
                      category: null,
                      subcategory: null,
                      subsubcategory: null,
                    });
                  }}
                  className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 ux-transition-color ${
                    activeCategory === 'all'
                      ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                      : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
                  }`}
                >
                  All Products
                </button>
                {parentCategories.map((category) => (
                  <button
                    type="button"
                    key={category.slug}
                    onClick={() => {
                      updateFilters({
                        category: category.slug,
                        subcategory: null,
                        subsubcategory: null,
                      });
                    }}
                    className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 ux-transition-color ${
                      activeCategory === category.slug
                        ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                        : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {activeCategory !== 'all' && activeSubcategories.length > 0 ? (
                <div className="w-full justify-center md:justify-start flex overflow-x-auto hide-scrollbar pb-2 px-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({
                          subcategory: null,
                          subsubcategory: null,
                        });
                      }}
                      className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                        activeSubcategory === 'all'
                          ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                      }`}
                    >
                      All
                    </button>
                    {activeSubcategories.map((subcategory) => (
                      <button
                        key={subcategory.slug}
                        type="button"
                        onClick={() => {
                          updateFilters({
                            subcategory: subcategory.slug,
                            subsubcategory: null,
                          });
                        }}
                        className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                          activeSubcategory === subcategory.slug
                            ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
                    {activeCategory === 'charm' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            updateFilters({
                              subcategory: 'newest-group',
                              subsubcategory: null,
                            });
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                            activeSubcategory === 'newest-group'
                              ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                          }`}
                        >
                          Newest Charm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateFilters({
                              subcategory: 'bestseller-group',
                              subsubcategory: null,
                            });
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                            activeSubcategory === 'bestseller-group'
                              ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                          }`}
                        >
                          Best Seller
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateFilters({
                              subcategory: 'gold-group',
                              subsubcategory: null,
                            });
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                            activeSubcategory === 'gold-group'
                              ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                          }`}
                        >
                          Gold
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateFilters({
                              subcategory: 'silver-group',
                              subsubcategory: null,
                            });
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                            activeSubcategory === 'silver-group'
                              ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                          }`}
                        >
                          Silver
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {activeCategory !== 'all' && activeSubcategory !== 'all' && activeSubSubcategories.length > 0 ? (
                <div className="w-full justify-center md:justify-start flex overflow-x-auto hide-scrollbar pb-3 px-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateFilters({ subsubcategory: null })}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ux-transition-color ${
                        activeSubSubcategory === 'all'
                          ? 'bg-[#ff4b86]/10 text-[#ff4b86] border-[#ff4b86]/30'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#ff4b86]/50 hover:text-[#ff4b86]'
                      }`}
                    >
                      All {activeSubcategories.find(s => s.slug === activeSubcategory)?.name || ''}
                    </button>
                    {activeSubSubcategories.map((subcategory) => (
                      <button
                        key={subcategory.slug}
                        type="button"
                        onClick={() => updateFilters({ subsubcategory: subcategory.slug })}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ux-transition-color ${
                          activeSubSubcategory === subcategory.slug
                            ? 'bg-[#ff4b86]/10 text-[#ff4b86] border-[#ff4b86]/30'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#ff4b86]/50 hover:text-[#ff4b86]'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Failed to load shop data'}
              </p>
              <button
                type="button"
                onClick={() => {
                  refetchProducts();
                  refetchCategories();
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark ux-transition-color text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : null}

          <ShopResults
            filteredProducts={filteredProducts}
            loading={loading}
            resetSignal={resultsResetSignal}
            onPrefetchProduct={prefetchProduct}
            onAddToCart={handleAddToCart}
          />
        </main>
      </div>
    </PageTransition>
  );
};

export default Shop;
