import { useCallback, useMemo, useState } from 'react';
import { LazyMotion, m } from 'framer-motion';

type ProductImageCarouselProps = {
  images: string[];
  alt: string;
  className?: string;
  onIndexChange?: (index: number) => void;
};

export function ProductImageCarousel(props: ProductImageCarouselProps) {
  const { images, alt, className, onIndexChange } = props;
  const [index, setIndex] = useState(0);

  const safeImages = useMemo(() => images.filter((v) => typeof v === 'string' && v.trim().length > 0), [images]);
  const hasImages = safeImages.length > 0;
  const hasMultiple = safeImages.length > 1;

  const setSafeIndex = useCallback(
    (next: number) => {
      if (!hasImages) return;
      const wrapped = ((next % safeImages.length) + safeImages.length) % safeImages.length;
      setIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [hasImages, safeImages.length, onIndexChange]
  );

  const prev = useCallback(() => setSafeIndex(index - 1), [index, setSafeIndex]);
  const next = useCallback(() => setSafeIndex(index + 1), [index, setSafeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!hasMultiple) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    },
    [hasMultiple, next, prev]
  );

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

  const activeSrc = safeImages[index]!;

  return (
    <div
      className={[
        'relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={hasMultiple ? 0 : -1}
      onKeyDown={handleKeyDown}
      aria-label={hasMultiple ? 'Product image carousel' : 'Product image'}
    >
      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <m.div
          className="aspect-[4/5] w-full select-none"
          drag={hasMultiple ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (!hasMultiple) return;
            const swipe = info.offset.x * 0.6 + info.velocity.x * 0.4;
            if (swipe < -120) next();
            if (swipe > 120) prev();
          }}
        >
          <img src={activeSrc} alt={alt} className="w-full h-full object-cover" draggable={false} />
        </m.div>
      </LazyMotion>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={prev}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/55 transition-colors"
            aria-label="Previous image"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={next}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/55 transition-colors"
            aria-label="Next image"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur">
            {safeImages.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                onClick={() => setSafeIndex(i)}
                className={[
                  'h-2 w-2 rounded-full transition-colors',
                  i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/60',
                ].join(' ')}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

