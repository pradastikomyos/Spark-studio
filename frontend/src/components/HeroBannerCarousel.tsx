import { memo, useRef, type ReactNode, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../hooks/useBanners';
import { useAutoSlider } from '../hooks/useAutoSlider';

type HeroBannerCarouselProps = {
  slides: Banner[];
  intervalMs?: number;
  containerClassName?: string;
  imageClassName?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  indicatorActiveClassName?: string;
  indicatorInactiveClassName?: string;
  renderOverlay?: (slide: Banner) => ReactNode;
  overlayClassName?: string;
};

const SWIPE_THRESHOLD = 50;

export const HeroBannerCarousel = memo(function HeroBannerCarousel({
  slides,
  intervalMs = 5000,
  containerClassName,
  imageClassName,
  prevButtonClassName,
  nextButtonClassName,
  indicatorActiveClassName,
  indicatorInactiveClassName,
  renderOverlay,
  overlayClassName,
}: HeroBannerCarouselProps) {
  const { index, setIndex, next, prev, bindHover } = useAutoSlider({
    length: slides.length,
    intervalMs,
  });

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchMove = (event: TouchEvent) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const onTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (slides.length === 0) return null;

  return (
    <div
      className={containerClassName}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...bindHover}
    >
      <div className="relative h-full w-full">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${slideIndex === index ? 'opacity-100' : 'opacity-0'}`}
          >
            {slide.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
              <video 
                src={slide.image_url} 
                className={imageClassName} 
                autoPlay 
                loop 
                muted 
                playsInline 
              />
            ) : (
              <img src={slide.image_url} alt={slide.title} className={imageClassName} />
            )}
            {renderOverlay ? <div className={overlayClassName}>{renderOverlay(slide)}</div> : null}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className={prevButtonClassName}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className={nextButtonClassName}
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, indicatorIndex) => (
              <button
                key={indicatorIndex}
                type="button"
                onClick={() => setIndex(indicatorIndex)}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${indicatorIndex === index ? indicatorActiveClassName : indicatorInactiveClassName}`}
                aria-label={`Go to slide ${indicatorIndex + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
});
