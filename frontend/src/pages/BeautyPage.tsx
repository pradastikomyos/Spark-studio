import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { DEFAULT_GLAM_PAGE_SETTINGS, useGlamPageSettings } from '../hooks/useGlamPageSettings';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../utils/formatters';

const GLAM_ASSET_BASE = '/images/glam%20page%20assets';
const STAR_ASSET_BASE = `${GLAM_ASSET_BASE}/STAR%20GLITTER%20TRANSPARENT%20BG`;

const decorativeStars = [
  {
    src: `${STAR_ASSET_BASE}/PINK%20RUSH.png`,
    alt: 'Pink glitter star',
    className: 'left-[2%] top-[5.5rem] w-24 sm:w-28 lg:left-[4%] lg:top-20 lg:w-32',
  },
  {
    src: `${STAR_ASSET_BASE}/SILVER%20BLINK.png`,
    alt: 'Silver glitter star',
    className: 'left-[4%] bottom-6 w-28 sm:w-32 lg:left-[1%] lg:bottom-2 lg:w-36',
  },
  {
    src: `${STAR_ASSET_BASE}/BRONZE.png`,
    alt: 'Bronze glitter star',
    className: 'left-[30%] bottom-0 w-20 sm:w-24 lg:left-[28%] lg:w-28',
  },
  {
    src: `${STAR_ASSET_BASE}/AURA%20POP.png`,
    alt: 'Sparkly mini star',
    className: 'left-[14%] top-[44%] hidden w-16 md:block lg:w-20',
  },
];

export default function BeautyPage() {
  const { settings, error: settingsError } = useGlamPageSettings();
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const content = settings ?? DEFAULT_GLAM_PAGE_SETTINGS;
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    const matches = products.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
      );
    });

    return normalizedQuery ? matches.slice(0, 12) : matches.slice(0, 6);
  }, [normalizedQuery, products]);

  const hasProductsError = productsError instanceof Error;
  const hasSettingsError = settingsError instanceof Error;

  return (
    <PageTransition>
      <main className="min-h-[calc(100vh-64px)] bg-white text-black">
        <section className="border-y border-black/20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:gap-16 lg:px-12 lg:py-16">
            <div className="overflow-hidden border border-black/20 bg-[#f5f1f0]">
              <img
                src={content.hero_image_url}
                alt={content.hero_title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-black/50">GLAM</p>
              <h1 className="font-script mt-4 text-5xl leading-none sm:text-6xl lg:text-7xl">
                {content.hero_title}
              </h1>
              <p className="mt-6 max-w-md text-xl leading-relaxed text-black/85 sm:text-2xl">
                {content.hero_description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
          <h2 className="font-script text-5xl leading-none sm:text-6xl">{content.look_heading}</h2>

          <div className="relative mt-8 min-h-[420px] overflow-hidden border-b border-black/20 pb-4 sm:min-h-[520px] lg:min-h-[560px]">
            {decorativeStars.map((star) => (
              <img
                key={star.src}
                src={star.src}
                alt={star.alt}
                className={`absolute object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.14)] ${star.className}`}
              />
            ))}

            <img
              src={content.look_model_image_url}
              alt="GLAM editorial model"
              className="absolute bottom-0 right-0 h-[85%] max-h-[560px] w-auto object-contain"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <div className="flex flex-col items-center gap-4">
            <h3 className="font-serif text-3xl italic tracking-wide">{content.product_section_title}</h3>
            <label className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={content.product_search_placeholder}
                className="w-full rounded-full border border-black/40 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-black"
              />
            </label>
            <p className="text-xs uppercase tracking-[0.25em] text-black/45">
              {normalizedQuery ? 'Showing search results' : 'Featured picks from the current store catalog'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/shop/product/${product.id}`}
                className="group border border-black/35 bg-white p-4 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden bg-[#faf7f8]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-black/25">
                      <span className="material-symbols-outlined text-6xl">{product.placeholder}</span>
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <h4 className="text-lg font-medium leading-snug text-black">{product.name}</h4>
                  <p className="mt-2 text-sm text-[#ff4b86]">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            ))}
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
      </main>
    </PageTransition>
  );
}
