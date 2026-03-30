import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import LookProductSidebar from '../components/dressing-room/LookProductSidebar';
import { DRESSING_ROOM_DEMO } from '../mock/dressingRoomDemo';
import { useCategories } from '../hooks/useCategories';
import { useDressingRoomCollection, type DressingRoomLook as DBLook } from '../hooks/useDressingRoomCollection';
import { useProductSummaries } from '../hooks/useProducts';
import { getOptimizedDressingRoomImageUrl, normalizeDressingRoomImageUrl } from '../utils/dressingRoomImageUrl';
import { formatCurrency } from '../utils/formatters';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 34 };
const VISIBLE_AHEAD = 3;
const PRODUCTS_PER_PAGE = 6;

// Stacked carousel transform (same as admin panel)
function getModelTransform(offset: number, containerWidth: number) {
  const absOffset = Math.abs(offset);
  if (offset < 0 || absOffset > VISIBLE_AHEAD) {
    return { scale: 0, opacity: 0, x: containerWidth + 100, blur: 14, zIndex: 0, display: false };
  }
  const scaleMap = [1, 0.75, 0.55, 0.4];
  const scale = scaleMap[absOffset] ?? 0.35;
  const opacityMap = [1, 0.85, 0.55, 0.3];
  const opacity = opacityMap[absOffset] ?? 0.2;
  const blurMap = [0, 2.5, 5, 8];
  const blur = blurMap[absOffset] ?? 10;
  const isMobileWidth = containerWidth < 640;
  const isTabletWidth = containerWidth >= 640 && containerWidth < 1024;

  // Anchor around center for smaller screens so it doesn't stick to the far right.
  const rightEdgeFactor = isMobileWidth ? 0.52 : isTabletWidth ? 0.56 : 0.6;
  const spacingFactor = isMobileWidth ? 0.22 : isTabletWidth ? 0.2 : 0.2;
  const center = containerWidth * 0.5;
  const rightEdge = containerWidth * rightEdgeFactor;
  const spacing = containerWidth * spacingFactor;
  const x = (rightEdge - (absOffset * spacing)) - center;
  const zIndex = 10 - absOffset;
  return { scale, opacity, x, blur, zIndex, display: true };
}

// Unified look interface for display
interface DisplayLook {
  lookNumber: number;
  coverImageUrl: string;
  photos: string[];
  items: DBLook['items'] | Array<{ id: number; label: string | null; productVariantId: number }>;
}

// Fetch photos for a look from database
async function fetchLookPhotos(lookId: number) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase
    .from('dressing_room_look_photos')
    .select('image_url')
    .eq('look_id', lookId)
    .order('sort_order', { ascending: true });
  return data?.map(p => p.image_url) || [];
}

export default function DressingRoomLandingPage() {
  const { collection, looks: dbLooks, isLoading } = useDressingRoomCollection();
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Convert DB looks to display format
  const displayLooks: DisplayLook[] = dbLooks.length > 0
    ? dbLooks.map(look => ({
        lookNumber: look.look_number,
        coverImageUrl: look.model_image_url,
        photos: [look.model_image_url], // Will be fetched on demand in detail section
        items: look.items,
      }))
    : DRESSING_ROOM_DEMO.looks;

  const title = collection?.title || DRESSING_ROOM_DEMO.title;
  const description = collection?.description || DRESSING_ROOM_DEMO.description;

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">Loading collection...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const scrollToLook = (lookNumber: number) => {
    const element = document.getElementById(`look-${lookNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goCarouselNext = () => {
    setCarouselIndex((i) => Math.min(displayLooks.length - 1, i + 1));
  };

  const goCarouselPrev = () => {
    setCarouselIndex((i) => Math.max(0, i - 1));
  };

  const scrollToCatalog = () => {
    const element = document.getElementById('fashion-catalog');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <PageTransition>
      <div className="bg-white">
        {/* Hero Section with Carousel */}
        <section className="bg-[#f6dbe6] border-b border-gray-300">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="max-w-5xl">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-black">
                  {title}
                </h1>
                <p className="mt-4 text-sm md:text-base text-gray-700 max-w-4xl leading-relaxed italic pr-4">
                  {description}
                </p>
              </div>

              <div className="flex md:justify-end">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="px-6 py-3 text-sm font-bold uppercase tracking-wider border border-gray-500 bg-white hover:bg-gray-50 transition-colors"
                >
                  FIND YOUR VIBE
                </button>
              </div>
            </div>

            {/* Horizontal Carousel */}
            <div className="mt-8 md:mt-10 relative">
              <div className="overflow-hidden">
                <div
                  className="flex gap-4 transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(calc(-${carouselIndex} * (20% + 0.2rem)))`,
                  }}
                >
                  {displayLooks.map((look) => (
                    <button
                      key={look.lookNumber}
                      type="button"
                      onClick={() => scrollToLook(look.lookNumber)}
                      className="group bg-white/60 border border-gray-200 hover:border-gray-400 transition-colors overflow-hidden text-left flex-shrink-0 w-[calc(20%-0.8rem)]"
                      aria-label={`Scroll to Look ${look.lookNumber}`}
                    >
                      <div className="aspect-[3/4] lg:aspect-[4/5] bg-white">
                        <img
                          src={look.coverImageUrl}
                          alt={`Look ${look.lookNumber}`}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.src = '/images/landing/neon.png';
                          }}
                        />
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-xs font-black tracking-[0.28em] text-gray-800 uppercase">
                          LOOK {look.lookNumber}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500 italic">
                          Lorem ipsum
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                type="button"
                onClick={goCarouselPrev}
                disabled={carouselIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-12 w-12 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                aria-label="Previous looks"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goCarouselNext}
                disabled={carouselIndex >= Math.max(0, displayLooks.length - 5)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-12 w-12 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                aria-label="Next looks"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Look Detail Sections */}
        {displayLooks.map((look) => (
          <LookDetailSection key={look.lookNumber} look={look} dbLook={dbLooks.find(l => l.look_number === look.lookNumber)} />
        ))}

        <FashionCatalogSection />
      </div>
    </PageTransition>
  );
}

interface LookDetailSectionProps {
  look: DisplayLook;
  dbLook?: DBLook;
}

function FashionCatalogSection() {
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProductSummaries();
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearchQuery]);

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

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
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
  const isCatalogLoading = (productsLoading || categoriesLoading) && products.length === 0;
  const hasCatalogError = productsError instanceof Error || categoriesError instanceof Error;

  return (
    <section id="fashion-catalog" className="border-b border-gray-300 bg-[#fcfaf7]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
            All fashion categories
          </p>
          <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
            Choose your Experience
          </h2>
          <label className="relative mt-8 w-full max-w-md">
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
              <div className="aspect-[3/4] overflow-hidden bg-[#f5f1ec]">
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
            Fashion catalog failed to load. Dressing Room content is still available.
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
      </div>
    </section>
  );
}

function LookDetailSection({ look, dbLook }: LookDetailSectionProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(700);
  const [isDragging, setIsDragging] = useState(false);
  const [photos, setPhotos] = useState<string[]>(look.photos);

  // Fetch photos on mount if we have a DB look
  useEffect(() => {
    if (!dbLook?.id) return;
    let cancelled = false;

    fetchLookPhotos(dbLook.id).then((fetchedPhotos) => {
      if (cancelled) return;
      if (fetchedPhotos.length > 0) setPhotos(fetchedPhotos);
    });

    return () => {
      cancelled = true;
    };
  }, [dbLook?.id]);

  const visiblePhotos = photos.map((photo: string, index: number) => ({
    photo,
    index,
    offset: index - activePhotoIndex,
  })).filter(({ offset }: { offset: number }) => offset >= 0 && offset <= VISIBLE_AHEAD);

  const goNext = () => setActivePhotoIndex((i) => Math.min(photos.length - 1, i + 1));
  const goPrev = () => setActivePhotoIndex((i) => Math.max(0, i - 1));

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 60;
    // Instagram-style: swipe right = next, swipe left = prev
    if (info.offset.x > threshold) goNext();
    else if (info.offset.x < -threshold) goPrev();
  };

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      id={`look-${look.lookNumber}`}
      className="bg-[#f5f3f0] min-h-screen border-b border-gray-300"
    >
      <div className="h-screen flex">
        <div className="flex-1 min-w-0 flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="flex items-start justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-gray-500 font-semibold">
                Dressing Room
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="h-10 sm:h-11 px-3 sm:px-4 inline-flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider"
            >
              Back to Top
            </button>
          </div>

          <div className="flex-1 min-h-0 relative">
            <motion.div
              ref={containerRef}
              className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              style={{ touchAction: 'pan-y', height: '100%' }}
            >
              <AnimatePresence mode="popLayout">
                {visiblePhotos.map(({ photo, index, offset }: { photo: string; index: number; offset: number }) => {
                  const t = getModelTransform(offset, containerWidth);
                  if (!t.display) return null;
                  const isActive = offset === 0;
                  const optimizedSrc = photo ? getOptimizedDressingRoomImageUrl(photo, { height: 900 }) : '';
                  
                  return (
                    <div
                      key={`visible-photo-${photo}`}
                      className="absolute inset-0 flex items-center justify-center lg:items-end pointer-events-none"
                    >
                      <motion.div
                        className="pointer-events-auto"
                        initial={{ scale: 0.3, opacity: 0, x: containerWidth + 100 }}
                        animate={{
                          scale: t.scale,
                          opacity: t.opacity,
                          x: t.x,
                          filter: `blur(${t.blur}px)`,
                          zIndex: t.zIndex,
                        }}
                        exit={{ scale: 0.3, opacity: 0, x: containerWidth + 200 }}
                        transition={SPRING}
                        onClick={() => { if (!isDragging && !isActive) setActivePhotoIndex(index); }}
                        style={{
                          willChange: 'transform, filter, opacity',
                          cursor: isActive ? 'default' : 'pointer',
                          transformOrigin: 'bottom center',
                        }}
                      >
                        <img
                          src={optimizedSrc}
                          alt={`Look ${look.lookNumber} photo ${index + 1}`}
                          className="h-auto w-auto max-w-none object-contain select-none pointer-events-none max-h-[calc(100vh-270px)] sm:max-h-[calc(100vh-240px)] lg:max-h-[calc(100vh-220px)]"
                          draggable={false}
                          decoding="async"
                          loading={isActive ? 'eager' : 'lazy'}
                          onError={(event) => {
                            const img = event.currentTarget;
                            const fallback = normalizeDressingRoomImageUrl(photo);
                            if ((img.getAttribute('src') ?? '') === fallback) return;
                            img.setAttribute('src', fallback);
                          }}
                        />
                      </motion.div>
                    </div>
                  );
                })}
              </AnimatePresence>

              {/* Navigation arrows */}
              <button
                type="button"
                onClick={goPrev}
                disabled={activePhotoIndex === 0}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 inline-flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-20 bg-white/80 rounded-full border border-gray-200 hover:bg-white transition-all"
                aria-label="Previous photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 sm:h-5 sm:w-5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={activePhotoIndex === photos.length - 1}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 inline-flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-20 bg-white/80 rounded-full border border-gray-200 hover:bg-white transition-all"
                aria-label="Next photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 sm:h-5 sm:w-5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </motion.div>
          </div>

          <div className="pt-3 sm:pt-4 flex items-center justify-between">
            <p className="text-xs sm:text-xl text-gray-900 uppercase tracking-widest font-black">
              LOOK {look.lookNumber}
            </p>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {photos.map((photo: string, idx: number) => (
                <button
                  key={`photo-dot-${photo}`}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className="h-8 sm:h-10 w-6 sm:w-8 inline-flex items-center justify-center"
                  aria-label={`Go to photo ${idx + 1}`}
                >
                  <span
                    className={[
                      'rounded-full transition-all duration-300',
                      idx === activePhotoIndex ? 'bg-gray-900 w-4 sm:w-5 h-1 sm:h-1.5' : 'bg-gray-300 w-1 sm:w-1.5 h-1 sm:h-1.5',
                    ].join(' ')}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden md:block w-[220px] lg:w-[280px] xl:w-[320px] shrink-0 border-l border-gray-200/50 bg-[#f0eeeb]/60 h-full overflow-y-auto hide-scrollbar overscroll-contain">
          <LookProductSidebar items={look.items as DBLook['items']} lookNumber={look.lookNumber} density="compact" />
        </div>
      </div>
    </section>
  );
}
