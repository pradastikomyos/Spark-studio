import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import ProductQuickViewModal from '../components/ProductQuickViewModal';
import { useBeautyPoster, type BeautyPosterTag } from '../hooks/useBeautyPoster';
import BeautyPosterInteractive from '../components/beauty/BeautyPosterInteractive';

type QuickViewState = {
  open: boolean;
  productId: number | null;
  variantId: number | null;
};

export default function BeautyPosterPage() {
  const { posterSlug } = useParams<{ posterSlug: string }>();
  const { data, isLoading, error } = useBeautyPoster(posterSlug);
  const poster = data?.poster ?? null;
  const tags = data?.tags ?? [];

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
            <p className="text-gray-500">Failed to load beauty poster.</p>
            <button onClick={() => window.location.reload()} className="text-sm underline text-gray-700 hover:text-gray-900">
              Try again
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!poster) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-display tracking-wider text-gray-800">NOT FOUND</h1>
            <p className="text-gray-500 max-w-md mx-auto">This poster is not available.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bg-white min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 pt-5 pb-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-400">Beauty</p>
            <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-display italic tracking-wide text-gray-900 truncate">
              {poster.title}
            </h1>
            {poster.description ? <p className="mt-2 text-sm text-gray-500 max-w-2xl">{poster.description}</p> : null}
          </div>

          <BeautyPosterInteractive
            posterTitle={poster.title}
            imageUrl={poster.image_url}
            tags={tags}
            onOpenQuickView={openQuickView}
          />
        </div>

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
