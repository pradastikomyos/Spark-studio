import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';
import { HeroBannerCarousel } from '../components/HeroBannerCarousel';

const OnStage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const {
    data: heroBanners = [],
    isLoading: heroLoading,
    error: heroError,
    refetch: refetchHero,
  } = useBanners('hero');
  const {
    data: stageBanners = [],
    isLoading: stageLoading,
    error: stageError,
    refetch: refetchStage,
  } = useBanners('stage');

  const hasData = heroBanners.length > 0 || stageBanners.length > 0;
  const loading = (heroLoading || stageLoading) && !hasData;
  const error = heroError || stageError;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate max slides based on viewport
  const maxSlides = isMobile ? stageBanners.length : Math.max(1, stageBanners.length - 2);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % maxSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + maxSlides) % maxSlides);
  };

  // Touch handlers for stage carousel
  const handleStageTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleStageTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleStageTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600"></div>
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-sm text-gray-600 mb-4">Gagal memuat konten. Coba lagi.</p>
          <button
            type="button"
            onClick={() => {
              refetchHero();
              refetchStage();
            }}
            className="inline-flex items-center justify-center rounded-md bg-main-600 px-4 py-2 text-white text-sm font-semibold hover:bg-main-700 transition-colors"
          >
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section with Slider */}
      <section className="relative w-full aspect-video md:aspect-auto md:h-[600px] overflow-hidden bg-gray-900">
        {heroBanners.length > 0 ? (
          <HeroBannerCarousel
            slides={heroBanners}
            intervalMs={8000}
            containerClassName="relative h-full w-full"
            imageClassName="w-full h-full object-cover md:object-cover"
            prevButtonClassName="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white p-2 md:p-3 rounded-full ux-transition-color touch-manipulation"
            nextButtonClassName="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white p-2 md:p-3 rounded-full ux-transition-color touch-manipulation"
            indicatorActiveClassName="bg-white"
            indicatorInactiveClassName="bg-white/50 hover:bg-white/70"
            overlayClassName="absolute inset-0"
            renderOverlay={(slide) => (
              <>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  {slide.title && (
                    <h1 className="text-white text-2xl md:text-6xl font-bold mb-4">{slide.title}</h1>
                  )}
                  {slide.subtitle ? (
                    <p className="text-white/90 text-sm md:text-xl">{slide.subtitle}</p>
                  ) : null}
                </div>
              </>
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-white/90">
            <p className="text-xl md:text-4xl font-semibold tracking-wide">SPARK ON STAGE</p>
          </div>
        )}
      </section>

      {/* Buy Ticket Button - Fixed positioning */}
      <div className="relative z-20 py-8 bg-white">
        <div className="flex justify-center">
          <Link
            to="/journey"
            className="inline-flex items-center gap-2 bg-main-600 hover:bg-main-700 text-white px-8 py-4 rounded-md shadow-lg transition-colors font-semibold"
          >
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            BE A STAR
          </Link>
        </div>
      </div>

      {/* Stage Carousel */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="relative">
          {/* Previous Button */}
          <button
            onClick={prevSlide}
            className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 z-10 bg-main-600 hover:bg-main-700 active:bg-main-800 text-white p-2 md:p-3 rounded-full shadow-lg transition-colors touch-manipulation"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Carousel Container */}
          <div
            className="overflow-hidden mx-8 md:mx-0"
            onTouchStart={handleStageTouchStart}
            onTouchMove={handleStageTouchMove}
            onTouchEnd={handleStageTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentSlide * (isMobile ? 100 : 100 / 3)}%)`
              }}
            >
              {stageBanners.map((stage) => (
                <div
                  key={stage.id}
                  className="w-full md:w-1/3 flex-shrink-0 px-3"
                >
                  <Link 
                    to={stage.link_url || '#'} 
                    className={`block bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow ${!stage.link_url ? 'cursor-default pointer-events-none' : ''}`}
                  >
                    {/* Stage Image */}
                    <div className="relative h-64 bg-gray-200">
                      {stage.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                        <video 
                          src={stage.image_url} 
                          className="w-full h-full object-cover pointer-events-none" 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                        />
                      ) : (
                        <img
                          src={stage.image_url}
                          alt={stage.title || 'Stage visual'}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      )}
                      {/* Stage Title Overlay */}
                      {stage.title && (
                        <div className="absolute top-4 left-4 bg-gray-800/80 text-white px-4 py-2 rounded">
                          <span className="text-sm font-semibold">{stage.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Stage Info */}
                    {stage.subtitle && (
                      <div className="p-6">
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {stage.subtitle}
                        </p>
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 z-10 bg-main-600 hover:bg-main-700 active:bg-main-800 text-white p-2 md:p-3 rounded-full shadow-lg transition-colors touch-manipulation"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: maxSlides }, (_, slideNumber) => slideNumber + 1).map((slideNumber) => (
            <button
              key={`slide-${slideNumber}`}
              onClick={() => setCurrentSlide(slideNumber - 1)}
              className={`w-2.5 h-2.5 rounded-full ux-transition-color touch-manipulation ${currentSlide === slideNumber - 1 ? 'bg-main-600' : 'bg-gray-300'
                }`}
              aria-label={`Go to slide ${slideNumber}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default OnStage;
