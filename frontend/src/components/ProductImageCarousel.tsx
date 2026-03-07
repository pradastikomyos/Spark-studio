import { useCallback, useMemo, useState } from 'react';
import { LazyMotion, m } from 'framer-motion';

type ProductImageCarouselProps = {
  images: string[];
  alt: string;
  className?: string;
  onIndexChange?: (index: number) => void;
  currentIndex?: number;
};

export function ProductImageCarousel(props: ProductImageCarouselProps) {
  const { images, alt, className, onIndexChange, currentIndex } = props;
  const [internalIndex, setInternalIndex] = useState(0);

  const isControlled = typeof currentIndex === 'number';
  const index = isControlled ? currentIndex : internalIndex;

  const safeImages = useMemo(() => images.filter((v) => typeof v === 'string' && v.trim().length > 0), [images]);
  const hasImages = safeImages.length > 0;
  const hasMultiple = safeImages.length > 1;

  const setSafeIndex = useCallback(
    (next: number) => {
      if (!hasImages) return;
      const wrapped = ((next % safeImages.length) + safeImages.length) % safeImages.length;
      
      if (!isControlled) {
        setInternalIndex(wrapped);
      }
      onIndexChange?.(wrapped);
    },
    [hasImages, safeImages.length, onIndexChange, isControlled]
  );

  const prev = useCallback(() => setSafeIndex(index - 1), [index, setSafeIndex]);
  const next = useCallback(() => setSafeIndex(index + 1), [index, setSafeIndex]);

  if (!hasImages) {
    return (
      <div
        className={[
          'rounded-2xl overflow-hidden bg-gray-100 border border-gray-200',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="aspect-[4/5] w-full flex items-center justify-center text-gray-300">
          <span className="material-symbols-outlined text-6xl">inventory_2</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={hasMultiple ? 0 : -1}
      aria-label={hasMultiple ? 'Product image carousel' : 'Product image'}
    >
      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <div className="relative w-full aspect-[4/5] overflow-hidden bg-gray-50">
             <m.div
                className="flex h-full w-full custom-scrollbar-hide"
                animate={{ x: `${-index * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag={false} // Drag disabled as per user request
             >
                {safeImages.map((src, i) => (
                    <div key={`${alt}-${src}`} className="min-w-full w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-50">
                        <img 
                            src={src} 
                            alt={`${alt} - View ${i + 1}`} 
                            className="w-full h-full object-cover" 
                            draggable={false} 
                        />
                    </div>
                ))}
             </m.div>
        
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={prev}
                className="flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/40 transition-colors"
                aria-label="Previous image"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={next}
                className="flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/40 transition-colors"
                aria-label="Next image"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur">
                {safeImages.map((src, i) => (
                  <button
                    key={`dot-${alt}-${src}`}
                    type="button"
                    onClick={() => setSafeIndex(i)}
                    className={[
                      'h-1.5 w-1.5 rounded-full transition-all',
                      i === index ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60',
                    ].join(' ')}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </LazyMotion>
    </div>
  );
}
