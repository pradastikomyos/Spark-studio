import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import ProductQuickViewModal from '../components/ProductQuickViewModal';
import { DEFAULT_GLAM_PAGE_SETTINGS, useGlamPageSettings } from '../hooks/useGlamPageSettings';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../utils/formatters';

const GLAM_ASSET_BASE = '/images/glam%20page%20assets';
const STAR_ASSET_BASE = `${GLAM_ASSET_BASE}/STAR%20GLITTER%20TRANSPARENT%20BG`;

const decorativeStars = [
  {
    slot: 'pink-rush',
    src: `${STAR_ASSET_BASE}/PINK%20RUSH.png`,
    alt: 'Pink glitter star',
    className: 'left-[2%] top-[5.5rem] w-24 sm:w-28 lg:left-[4%] lg:top-20 lg:w-32',
  },
  {
    slot: 'silver-blink',
    src: `${STAR_ASSET_BASE}/SILVER%20BLINK.png`,
    alt: 'Silver glitter star',
    className: 'left-[4%] bottom-6 w-28 sm:w-32 lg:left-[1%] lg:bottom-2 lg:w-36',
  },
  {
    slot: 'bronze',
    src: `${STAR_ASSET_BASE}/BRONZE.png`,
    alt: 'Bronze glitter star',
    className: 'left-[30%] bottom-0 w-20 sm:w-24 lg:left-[28%] lg:w-28',
  },
  {
    slot: 'aura-pop',
    src: `${STAR_ASSET_BASE}/AURA%20POP.png`,
    alt: 'Sparkly mini star',
    className: 'left-[14%] top-[44%] w-12 sm:w-16 lg:w-20',
  },
];

type QuickViewState = {
  open: boolean;
  productId: number | null;
};

export default function BeautyPage() {
  const { settings, error: settingsError } = useGlamPageSettings();
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [quickView, setQuickView] = useState<QuickViewState>({ open: false, productId: null });
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearchQuery]);

  const content = settings ?? DEFAULT_GLAM_PAGE_SETTINGS;
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const starLinkMap = useMemo(
    () => new Map(content.look_star_links.map((link) => [link.slot, link])),
    [content.look_star_links]
  );
  const productLookup = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const MAKEUP_SLUGS = new Set(['makeup', 'eyewear', 'glitter', 'headliner']);
  const makeupProducts = useMemo(() => {
    return products.filter(p => p.categorySlug != null && MAKEUP_SLUGS.has(p.categorySlug));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const matches = makeupProducts.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
      );
    });

    return matches;
  }, [normalizedQuery, makeupProducts]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasProductsError = productsError instanceof Error;
  const hasSettingsError = settingsError instanceof Error;

  return (
    <PageTransition>
      <main className="min-h-[calc(100vh-64px)] bg-white text-black">
        <section className="border-y border-black/20">
          <div className="mx-auto grid max-w-7xl grid-cols-[2fr_3fr] items-center gap-8 px-6 py-10 sm:gap-12 sm:px-8 sm:py-12 lg:gap-20 lg:px-12 lg:py-16">
            <div className="aspect-[4/5] w-full max-w-xs overflow-hidden bg-[#f5f1f0] md:max-w-sm">
              <img
                src={content.hero_image_url}
                alt={content.hero_title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex w-full flex-col items-end text-right">
              <h1 className="font-script mt-3 text-[2rem] leading-none sm:mt-4 sm:text-6xl lg:text-7xl">
                {content.hero_title}
              </h1>
              <p className="mt-3 max-w-md text-[11px] leading-relaxed text-black/85 sm:mt-6 sm:text-2xl">
                {content.hero_description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <h2 className="font-script text-4xl leading-none sm:text-6xl">{content.look_heading}</h2>

          <div className="mt-8 grid grid-cols-[1fr_1fr] items-stretch gap-4 border-b border-black/20 pb-8 sm:gap-6 lg:gap-8">
            {/* Left: 2x2 star product grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {decorativeStars.map((star) => {
                const starLink = starLinkMap.get(star.slot) ?? null;
                const productId = starLink?.product_id ?? null;
                const linkedProduct = productId ? productLookup.get(productId) ?? null : null;
                const starImage = (
                  <img
                    src={starLink?.image_url ?? star.src}
                    alt={star.alt}
                    className="h-full w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.12)] transition-transform duration-200"
                  />
                );

                if (!productId) {
                  return (
                    <div key={star.slot} className="flex aspect-square items-center justify-center p-4">
                      {starImage}
                    </div>
                  );
                }

                return (
                  <button
                    key={star.slot}
                    type="button"
                    title={linkedProduct ? `Open ${linkedProduct.name}` : 'Open linked product'}
                    aria-label={linkedProduct ? `Open ${linkedProduct.name}` : 'Open linked product'}
                    onClick={() => setQuickView({ open: true, productId })}
                    className="flex aspect-square cursor-pointer items-center justify-center p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b86] focus-visible:ring-offset-2"
                  >
                    <span className="block h-full w-full transition-transform duration-200 hover:scale-[1.06] active:scale-[0.98]">
                      {starImage}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: large model photo */}
            <div className="flex items-end justify-center overflow-hidden">
              <img
                src={content.look_model_image_url}
                alt="GLAM editorial model"
                className="h-full max-h-[600px] w-full object-cover object-top"
              />
            </div>
          </div>
        </section>


        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-8 sm:pb-16 lg:px-12 lg:pb-24">
          <div className="flex flex-col items-center gap-4">
            <h3 className="font-serif text-3xl italic tracking-wide">{content.product_section_title}</h3>
            <label className="relative w-full max-w-[400px]">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={content.product_search_placeholder}
                className="w-full rounded-full border border-black/30 bg-white py-3.5 pl-12 pr-6 text-sm outline-none transition-colors focus:border-black"
              />
            </label>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mx-auto">
            {paginatedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/shop/product/${product.id}`}
                className="group flex flex-col border border-black/20 bg-white transition-opacity hover:opacity-80"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#faf7f8]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-black/15">
                      <span className="material-symbols-outlined text-3xl">{product.placeholder}</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3 text-left">
                  <h4 className="text-[11px] font-semibold leading-tight text-black line-clamp-1 sm:text-sm">{product.name}</h4>
                  <p className="mt-1 text-[10px] font-bold text-[#ff4b86] sm:text-xs">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center items-center gap-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-black/20 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-black/50 tracking-wide">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-black/20 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!productsLoading && filteredProducts.length === 0 ? (
            <div className="mt-10 border border-dashed border-black/20 px-6 py-12 text-center text-black/55">
              No products match your search yet.
            </div>
          ) : null}

          {productsLoading ? (
            <div className="mt-10 text-center text-sm text-black/45">Loading products...</div>
          ) : null}

          {hasProductsError ? (
            <div className="mt-8 text-center text-sm text-red-600">
              Product catalog failed to load. The page content is still available.
            </div>
          ) : null}

          {hasSettingsError ? (
            <div className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-black/40">
              Using default GLAM content while saved settings are unavailable.
            </div>
          ) : null}
        </section>

        <ProductQuickViewModal
          open={quickView.open}
          productId={quickView.productId}
          onClose={() => setQuickView({ open: false, productId: null })}
        />
      </main>
    </PageTransition>
  );
}
