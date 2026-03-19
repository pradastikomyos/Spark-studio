import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DEFAULT_EVENT_PAGE_SETTINGS, useEventSettings } from '../hooks/useEventSettings';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../utils/formatters';

const PRODUCTS_PER_PAGE = 6;

const Events = () => {
  const { settings, isLoading: settingsLoading } = useEventSettings();
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearchQuery]);

  const content = settings ?? DEFAULT_EVENT_PAGE_SETTINGS;
  const heroImages = content.hero_images.filter(Boolean);
  const magicTitle = content.magic_title;
  const magicDesc = content.magic_description;
  const magicBtnText = content.magic_button_text;
  const magicBtnLink = content.magic_button_link;
  const magicImages = content.magic_images.filter(Boolean);
  const expTitle = content.experience_title;
  const expImages = content.experience_images.filter(Boolean);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

  const fashionCategorySlugs = useMemo(() => {
    const fashionParent = categories.find((category) => category.slug === 'fashion');
    if (!fashionParent) return new Set(['fashion']);

    const next = new Set<string>(['fashion']);
    categories
      .filter((category) => category.parent_id === fashionParent.id)
      .forEach((category) => {
        next.add(category.slug);
      });

    return next;
  }, [categories]);

  const fashionProducts = useMemo(() => {
    return products.filter((product) => {
      const slug = product.categorySlug?.toLowerCase();
      return slug != null && fashionCategorySlugs.has(slug);
    });
  }, [products, fashionCategorySlugs]);

  const filteredProducts = useMemo(() => {
    return fashionProducts.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [fashionProducts, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );
  const hasCatalogError = productsError instanceof Error || categoriesError instanceof Error;
  const isCatalogLoading = (productsLoading || categoriesLoading) && products.length === 0;

  if (settingsLoading) {
    return (
      <div className="bg-background-light min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfcf9] min-h-screen text-gray-900 selection:bg-primary/20">
      
      {/* 1. Hero Gallery Row (Dynamic Layout) */}
      <section className="flex h-[42vh] w-full snap-x snap-mandatory overflow-x-auto hide-scrollbar sm:h-[50vh] md:h-[65vh]">
        {heroImages.map((img, idx) => (
          <div 
            key={idx} 
            className="flex-none h-full border-r border-[#fcfcf9]/20 last:border-0 relative group snap-start bg-gray-100"
            style={{ width: `${100 / Math.min(5, Math.max(1, heroImages.length))}vw` }}
          >
            <img 
              src={img} 
              alt={`Gallery ${idx + 1}`} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              onError={(e) => { 
                // Hide completely or replace with a placeholder if it breaks
                e.currentTarget.style.display = 'none'; 
              }}
            />
          </div>
        ))}
      </section>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-32">
        
        {/* 2. Capturing Magic Moment Section */}
        <section className="mb-20 grid grid-cols-[minmax(0,1.2fr)_minmax(7rem,0.8fr)] items-start gap-4 sm:mb-32 sm:flex sm:items-center sm:gap-12 md:gap-24">
          <div className="min-w-0 flex-1 max-w-xl">
            <h1 
              className="font-script mb-4 text-[2rem] leading-none text-gray-800 whitespace-pre-line sm:mb-8 sm:text-6xl lg:text-7xl"
            >
              {magicTitle.toLowerCase() === 'every moment deserves to spark' ? 'Every moment\ndeserves to Spark' : magicTitle}
            </h1>
            <p className="mb-5 text-[11px] leading-relaxed font-light text-gray-500 sm:mb-10 sm:text-base">
              {magicDesc}
            </p>
            {magicBtnText && (
              <a 
                href={magicBtnLink} 
                className="inline-block border border-gray-300 px-4 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-gray-900 hover:text-white sm:px-8 sm:text-xs sm:tracking-widest"
              >
                {magicBtnText}
              </a>
            )}
          </div>
          
          <div className="flex justify-end sm:flex-1">
            <div className="relative aspect-[3/4] w-full max-w-[8.5rem] sm:max-w-md">
              {magicImages[0] && (
                <img 
                  src={magicImages[0]} 
                  alt="Magic moment text accompanying image" 
                  className="w-full h-full object-cover shadow-xl"
                />
              )}
            </div>
          </div>
        </section>

        {/* 3. Image Collage (3 images side by side layout) */}
        <section className="mb-20 sm:mb-32">
          <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-6 md:gap-8">
            {expImages.map((img, idx) => {
              // Create an interesting staggered layout like the sketch
              const heights = ['aspect-square', 'aspect-[3/4]', 'aspect-[4/5]'];
              const margins = ['mb-0', 'mb-6 sm:mb-12', 'mb-0'];
              
              return (
                <div key={idx} className={`w-full ${margins[idx % 3]}`}>
                  <img 
                    src={img} 
                    alt={`Experience ${idx + 1}`} 
                    className={`w-full object-cover ${heights[idx % 3]} shadow-sm`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Fashion Catalog */}
        <section className="mb-24 text-center sm:mb-40">
          <h2 className="font-display mb-10 text-2xl text-gray-800 sm:mb-16 sm:text-3xl md:text-4xl">
            {expTitle.split(' ').map((word, i) => {
              const isItalic = word.toLowerCase() === 'your';
              return (
                <span key={i} className={isItalic ? 'italic font-light' : 'font-normal'}>
                  {word}{' '}
                </span>
              );
            })}
          </h2>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-400 sm:text-xs">
              Curated fashion picks
            </p>
            <label className="relative w-full">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fashion..."
                className="w-full rounded-full border border-gray-300 bg-white py-3.5 pl-12 pr-6 text-sm text-gray-800 outline-none transition-colors focus:border-gray-700"
              />
            </label>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {paginatedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/shop/product/${product.id}`}
                className="group border border-gray-200 bg-white text-left transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#f7f4ef]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-3xl">{product.placeholder}</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-4">
                  <h3 className="text-sm font-semibold leading-tight text-gray-900 sm:text-base">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b55a6a] sm:text-sm">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {!isCatalogLoading && filteredProducts.length === 0 ? (
            <div className="mt-10 border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500">
              No fashion products match your search yet.
            </div>
          ) : null}

          {isCatalogLoading ? (
            <div className="mt-10 text-center text-sm text-gray-500">Loading fashion catalog...</div>
          ) : null}

          {hasCatalogError ? (
            <div className="mt-8 text-center text-sm text-red-600">
              Fashion catalog failed to load. Event page content is still available.
            </div>
          ) : null}

          {filteredProducts.length > 0 ? (
            <div className="mt-10 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium tracking-[0.2em] text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>

      </main>
    </div>
  );
};

export default Events;
