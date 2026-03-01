import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '../components/PageTransition';
import ProductQuickViewModal from '../components/ProductQuickViewModal';
import BeautyPosterInteractive from '../components/beauty/BeautyPosterInteractive';
import { useBeautyPosters } from '../hooks/useBeautyPosters';
import { useBeautyPoster, type BeautyPosterTag } from '../hooks/useBeautyPoster';

type QuickViewState = {
  open: boolean;
  productId: number | null;
  variantId: number | null;
};

function sectionLabel(index: number): string {
  return `Poster ${String(index + 1).padStart(2, '0')}`;
}

export default function BeautyPage() {
  const { data: posters = [], isLoading, error } = useBeautyPosters();
  const [quickView, setQuickView] = useState<QuickViewState>({ open: false, productId: null, variantId: null });

  const openQuickView = (tag: BeautyPosterTag) => {
    const pv = tag.product_variant;
    if (!pv?.product?.id) return;
    setQuickView({ open: true, productId: pv.product.id, variantId: pv.id });
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center">
          <div className="animate-pulse space-y-4 text-center">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-3 bg-gray-200 rounded w-72 mx-auto" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <p className="text-gray-500">Failed to load beauty posters.</p>
            <button onClick={() => window.location.reload()} className="text-sm underline text-gray-700 hover:text-gray-900">
              Try again
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const visiblePosters = posters.slice(0, 2);

  if (visiblePosters.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-display tracking-wider text-gray-800">COMING SOON</h1>
            <p className="text-gray-500 max-w-md mx-auto">Our beauty editorial is being curated. Stay tuned.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bg-[#fbfafb] min-h-[calc(100vh-64px)]">
        {visiblePosters.map((poster, index) => (
          <BeautyPosterSection
            key={poster.id}
            posterSlug={poster.slug}
            index={index}
            showIntro={index === 0}
            showScrollHint={index === 0 && visiblePosters.length > 1}
            onOpenQuickView={openQuickView}
          />
        ))}

        <ProductQuickViewModal
          open={quickView.open}
          productId={quickView.productId}
          initialVariantId={quickView.variantId}
          onClose={() => setQuickView({ open: false, productId: null, variantId: null })}
        />
      </div>
    </PageTransition>
  );
}

function BeautyPosterSection({
  posterSlug,
  index,
  showIntro,
  showScrollHint,
  onOpenQuickView,
}: {
  posterSlug: string;
  index: number;
  showIntro: boolean;
  showScrollHint: boolean;
  onOpenQuickView: (tag: BeautyPosterTag) => void;
}) {
  const { data, isLoading } = useBeautyPoster(posterSlug);
  const poster = data?.poster ?? null;
  const tags = data?.tags ?? [];

  const [loadedOnce, setLoadedOnce] = useState(false);
  useEffect(() => {
    if (poster) setLoadedOnce(true);
  }, [poster]);

  return (
    <section className="min-h-[calc(100vh-64px)] flex flex-col">
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col pl-3 pr-2 sm:px-4 md:px-6 lg:px-10 pt-6 md:pt-8 pb-3">
          {showIntro ? (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.28em] text-gray-400">Beauty</p>
              <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-display italic tracking-wide text-gray-900">
                Editorial Posters
              </h1>
              <p className="mt-3 text-sm text-gray-500 max-w-2xl">
                Discover products directly from the poster—like an interactive magazine spread.
              </p>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">{sectionLabel(index)}</p>
              <h2 className="mt-2 text-xl sm:text-2xl md:text-3xl font-display italic tracking-wide text-gray-900 truncate">
                {poster?.title ?? 'Loading...'}
              </h2>
              {poster?.description ? <p className="mt-2 text-sm text-gray-500 max-w-2xl">{poster.description}</p> : null}
            </div>

            {poster ? (
              <Link
                to={`/beauty/${poster.slug}`}
                className="hidden md:inline-flex h-11 px-4 rounded-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm text-xs tracking-wide whitespace-nowrap"
              >
                Open poster
              </Link>
            ) : null}
          </div>

          <div className="mt-4">
            {!poster && isLoading && !loadedOnce ? (
              <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
                <div className="aspect-[4/5] bg-gray-100 animate-pulse" />
                <div className="p-5 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-60 animate-pulse" />
                </div>
              </div>
            ) : poster ? (
              <BeautyPosterInteractive
                posterTitle={poster.title}
                imageUrl={poster.image_url}
                tags={tags}
                onOpenQuickView={onOpenQuickView}
              />
            ) : (
              <div className="rounded-3xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
                This poster is not available.
              </div>
            )}
          </div>
        </div>
      </div>

      {showScrollHint ? (
        <div className="flex-shrink-0 flex justify-center pb-5">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
