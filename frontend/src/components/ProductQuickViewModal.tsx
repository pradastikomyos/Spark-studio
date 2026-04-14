import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LazyMotion, m, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ExternalLink } from 'lucide-react';
import { useCart } from '../contexts/cartStore';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { ProductImageCarousel } from './ProductImageCarousel';
import { fetchProductDetail, type ProductDetail } from '../hooks/useProduct';
import { queryKeys } from '../lib/queryKeys';
import { formatCurrency } from '../utils/formatters';

type ProductQuickViewModalProps = {
  open: boolean;
  productId: number | null;
  initialVariantId?: number | null;
  onClose: () => void;
};

export default function ProductQuickViewModal({ open, productId, initialVariantId, onClose }: ProductQuickViewModalProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const enabled = open && productId != null;
  const { data: product, isLoading, error } = useQuery({
    queryKey: productId != null ? queryKeys.product(productId) : ['product', 'missing'],
    enabled,
    queryFn: ({ signal }) => fetchProductDetail(productId as number, signal),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!product || !open) {
      setSelectedVariantId(null);
      setImageIndex(0);
      return;
    }

    const initial =
      (initialVariantId != null ? product.variants.find((v) => v.id === initialVariantId) : null) ??
      product.variants.find((v) => v.available > 0) ??
      product.variants[0] ??
      null;

    setSelectedVariantId(initial ? initial.id : null);
    setImageIndex(0);
  }, [product, open, initialVariantId]);

  const selectedVariant = useMemo(() => {
    if (!product || selectedVariantId == null) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const handleAddToCart = () => {
    if (!user) {
      showToast('error', 'Please login to add items to cart');
      onClose();
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (!product || !selectedVariant) return;
    if (selectedVariant.available <= 0) return;

    const previous = queryClient.getQueryData<ProductDetail | null>(queryKeys.product(product.id)) ?? null;
    const optimistic: ProductDetail = {
      ...product,
      variants: product.variants.map((variant) =>
        variant.id === selectedVariant.id ? { ...variant, available: Math.max(0, variant.available - 1) } : variant
      ),
    };
    queryClient.setQueryData(queryKeys.product(product.id), optimistic);

    try {
      const fallbackImages = product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
      const imageFromCarousel = fallbackImages[imageIndex] ?? null;
      addItem(
        {
          productId: product.id,
          productName: product.name,
          productImageUrl: selectedVariant.imageUrl ?? imageFromCarousel ?? product.imageUrl,
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          unitPrice: selectedVariant.price,
        },
        1
      );
      showToast('success', 'Added to shopping bag');
    } catch {
      showToast('error', 'Failed to add to cart');
      queryClient.setQueryData(queryKeys.product(product.id), previous);
    }
  };

  const renderVariantSwatch = (variant: NonNullable<ProductDetail['variants']>[number]) => {
    const colorString = typeof variant.color === 'string' ? variant.color.trim() : '';
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(colorString) ? colorString : null;
    if (!hex) return null;

    return (
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 rounded-full border border-black/10"
        style={{ backgroundColor: hex }}
      />
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
          <m.div
            className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-0 md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Close"
              onClick={onClose}
            />

            <m.div
              role="dialog"
              aria-modal="true"
              className="relative w-full md:max-w-4xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Quick View</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{product?.name ?? 'Product'}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="bg-[#FAFAFA] p-5 md:p-6">
                  {isLoading ? (
                    <div className="rounded-3xl overflow-hidden bg-gray-100 animate-pulse aspect-[4/5]" />
                  ) : product ? (
                    <ProductImageCarousel
                      images={product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []}
                      alt={product.name}
                      onIndexChange={setImageIndex}
                      currentIndex={imageIndex}
                    />
                  ) : (
                    <div className="rounded-3xl bg-gray-100 aspect-[4/5]" />
                  )}
                </div>

                <div className="p-5 md:p-6">
                  {error ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-50 p-4 text-sm text-red-700">
                      Failed to load product.
                    </div>
                  ) : null}

                  {product ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Price</p>
                        <p className="font-serif text-3xl text-gray-900">
                          {formatCurrency(selectedVariant ? selectedVariant.price : product.variants[0]?.price ?? 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">Select Variant</p>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.map((variant) => {
                            const isSelected = selectedVariantId === variant.id;
                            const isDisabled = variant.available <= 0;
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => setSelectedVariantId(variant.id)}
                                disabled={isDisabled}
                                className={[
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wider',
                                  isSelected
                                    ? 'border-[#e63d75] bg-[#e63d75] text-white shadow-sm shadow-pink-200'
                                    : isDisabled
                                      ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                                ].join(' ')}
                              >
                                {renderVariantSwatch(variant) ?? null}
                                <span>{variant.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                        <m.button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!selectedVariant || selectedVariant.available <= 0}
                          className="w-full bg-[#e63d75] text-white py-4 rounded-2xl uppercase tracking-widest text-xs font-bold shadow-lg shadow-pink-200 hover:bg-[#cc2f64] active:bg-[#a32550] ux-transition-color disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          {!selectedVariant || selectedVariant.available <= 0 ? 'Out of Stock' : 'Add to Bag'}
                        </m.button>

                        <Link
                          to={productId != null ? `/shop/product/${productId}` : '/shop'}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                          onClick={onClose}
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No product selected.</div>
                  )}
                </div>
              </div>
            </m.div>
          </m.div>
        </LazyMotion>
      )}
    </AnimatePresence>
  );
}
