import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BeautyPosterTag } from '../../hooks/useBeautyPoster';

type ProductListItem = {
  tag: BeautyPosterTag;
  productId: number;
  variantId: number;
  title: string;
  productName: string;
  imageUrl: string | null;
  price: number | null;
};

function tagDisplayName(tag: BeautyPosterTag): string {
  const pv = tag.product_variant;
  if (!pv) return 'Product';
  return tag.label || pv.name;
}

export default function BeautyPosterInteractive({
  posterTitle,
  imageUrl,
  tags,
  onOpenQuickView,
}: {
  posterTitle: string;
  imageUrl: string;
  tags: BeautyPosterTag[];
  onOpenQuickView: (tag: BeautyPosterTag) => void;
}) {
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [poppedTagId, setPoppedTagId] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const productsList: ProductListItem[] = useMemo(() => {
    return tags
      .filter((t) => t.product_variant?.product?.id)
      .map((t) => ({
        tag: t,
        productId: t.product_variant!.product.id,
        variantId: t.product_variant!.id,
        title: tagDisplayName(t),
        productName: t.product_variant!.product.name,
        imageUrl: t.resolved_image_url ?? t.product_variant!.product.image_url ?? null,
        price: t.product_variant!.price,
      }));
  }, [tags]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">Get The Look</p>
          <p className="mt-1 text-sm text-gray-500 max-w-2xl">
            Tap a product tag on the poster to view details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileProductsOpen(true)}
          className="lg:hidden h-11 px-4 rounded-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm text-xs tracking-wide whitespace-nowrap"
        >
          Products ({productsList.length})
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),320px] gap-5">
        <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-[#FAFAFA]">
          <img src={imageUrl} alt={posterTitle} className="w-full h-auto object-cover" loading="eager" decoding="async" />

          <div className="absolute inset-0">
            {tags.map((tag) => {
              const size = Number.isFinite(tag.size_pct) ? tag.size_pct : 6;
              const sizeCss = `clamp(36px, ${size}%, 180px)`;
              const isPopped = poppedTagId === tag.id;
              return (
                <motion.button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    timersRef.current.forEach((t) => window.clearTimeout(t));
                    timersRef.current = [];

                    setPoppedTagId(tag.id);
                    timersRef.current.push(
                      window.setTimeout(() => {
                        onOpenQuickView(tag);
                      }, 140)
                    );
                    timersRef.current.push(
                      window.setTimeout(() => {
                        setPoppedTagId((current) => (current === tag.id ? null : current));
                      }, 420)
                    );
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{
                    left: `${tag.x_pct}%`,
                    top: `${tag.y_pct}%`,
                    width: sizeCss,
                    height: sizeCss,
                    zIndex: isPopped ? 40 : 10,
                  }}
                  aria-label={`Open ${tagDisplayName(tag)}`}
                  whileHover={{ scale: 1.06, y: -8, zIndex: 30 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span
                    className="relative flex h-full w-full items-center justify-center rounded-2xl bg-white/90 border border-black/10 shadow-lg overflow-hidden backdrop-blur-sm"
                    animate={
                      isPopped
                        ? { scale: 1.08, y: -10, boxShadow: '0 22px 48px rgba(0,0,0,0.18)' }
                        : { scale: 1, y: 0, boxShadow: '0 10px 22px rgba(0,0,0,0.10)' }
                    }
                    transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}
                  >
                    {tag.resolved_image_url ? (
                      <img
                        src={tag.resolved_image_url}
                        alt={tagDisplayName(tag)}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <span className="material-symbols-outlined text-gray-300">image</span>
                    )}
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-black/10 flex items-center justify-center shadow">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e63d75]" />
                    </span>
                  </motion.span>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {tagDisplayName(tag)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <aside className="hidden lg:block rounded-3xl border border-gray-100 bg-white p-5 h-fit sticky top-24">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Products</p>
          <div className="mt-4 space-y-3">
            {productsList.length === 0 ? (
              <p className="text-sm text-gray-400">No products tagged yet.</p>
            ) : (
              productsList.map((p) => (
                <button
                  key={p.tag.id}
                  type="button"
                  onClick={() => onOpenQuickView(p.tag)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3 hover:bg-white hover:border-gray-200 transition-colors text-left"
                >
                  <div className="h-14 w-14 rounded-xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.title} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <div className="h-full w-full bg-gray-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">{p.productName}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#e63d75] font-bold">View</span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {mobileProductsOpen && (
          <motion.div
            className="fixed inset-0 z-[200] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              aria-label="Close products"
              onClick={() => setMobileProductsOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl bg-white shadow-2xl border-t border-black/5 overflow-hidden"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-black/5">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">Products</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{posterTitle}</p>
                </div>
                <button
                  type="button"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  aria-label="Close"
                  onClick={() => setMobileProductsOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto hide-scrollbar overscroll-contain pb-[env(safe-area-inset-bottom)] p-4 space-y-3">
                {productsList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No products tagged yet.</p>
                ) : (
                  productsList.map((p) => (
                    <button
                      key={p.tag.id}
                      type="button"
                      onClick={() => {
                        setMobileProductsOpen(false);
                        onOpenQuickView(p.tag);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3 hover:bg-white hover:border-gray-200 transition-colors text-left"
                    >
                      <div className="h-14 w-14 rounded-xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                        ) : (
                          <div className="h-full w-full bg-gray-100" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">{p.productName}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-[#e63d75] font-bold">View</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
