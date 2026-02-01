import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';

const OnStage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  const { data: heroBanners = [], isLoading: heroLoading } = useBanners('hero');
  const { data: stageBanners = [], isLoading: stageLoading } = useBanners('stage');

  const loading = heroLoading || stageLoading;

  // Auto-advance hero slider every 5 seconds
  useEffect(() => {
    if (heroBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, stageBanners.length - 2));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.max(1, stageBanners.length - 2)) % Math.max(1, stageBanners.length - 2));
  };

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroBanners.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section with Slider */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        {/* Hero Slides */}
        <div className="relative h-full">
          {heroBanners.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Background Image */}
              <img
                src={slide.image_url}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50"></div>

              {/* Hero Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-white text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="text-white/90 text-lg md:text-xl animate-fade-in-delay">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Hero Navigation Buttons */}
        <button
          onClick={prevHeroSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextHeroSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Hero Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHeroSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentHeroSlide === index ? 'bg-white w-8' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Buy Ticket Button - Fixed positioning */}
      <div className="relative z-20 py-8 bg-white">
        <div className="flex justify-center">
          <Link
            to="/journey"
            className="inline-flex items-center gap-2 bg-main-600 hover:bg-main-700 text-white px-8 py-4 rounded-md shadow-lg transition-colors font-semibold"
          >
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            Buy Ticket
          </Link>
        </div>
      </div>

      {/* Stage Carousel */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="relative">
          {/* Previous Button */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-main-600 hover:bg-main-700 text-white p-3 rounded-full shadow-lg transition-colors -ml-4"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Carousel Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * (100 / 3)}%)` }}
            >
              {stageBanners.map((stage) => (
                <div
                  key={stage.id}
                  className="w-full md:w-1/3 flex-shrink-0 px-3"
                >
                  <div className="bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    {/* Stage Image */}
                    <div className="relative h-64 bg-gray-200">
                      <img
                        src={stage.image_url}
                        alt={stage.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Stage Title Overlay */}
                      <div className="absolute top-4 left-4 bg-gray-800/80 text-white px-4 py-2 rounded">
                        <span className="text-sm font-semibold">{stage.title}</span>
                      </div>
                    </div>

                    {/* Stage Info */}
                    <div className="p-6">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {stage.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-main-600 hover:bg-main-700 text-white p-3 rounded-full shadow-lg transition-colors -mr-4"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.max(1, stageBanners.length - 2) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === index ? 'bg-main-600 w-8' : 'bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default OnStage;
