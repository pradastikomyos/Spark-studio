import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';
import { DEFAULT_BOOKING_PAGE_SETTINGS, useBookingPageSettings } from '../hooks/useBookingPageSettings';
import { HeroBannerCarousel } from '../components/HeroBannerCarousel';
import { useAuth } from '../contexts/AuthContext';
import { toLocalDateString } from '../utils/timezone';
import { JourneyCalendarSection } from './journey-selection/JourneyCalendarSection';
import { JourneySummaryCard } from './journey-selection/JourneySummaryCard';
import { JourneyTimeSlotsSection } from './journey-selection/JourneyTimeSlotsSection';
import { useJourneySelectionController } from './journey-selection/useJourneySelectionController';

const OnStage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings: bookingSettings } = useBookingPageSettings();
  const bookingCopy = bookingSettings ?? DEFAULT_BOOKING_PAGE_SETTINGS;
  const [currentProcessSlide, setCurrentProcessSlide] = useState(0);

  const {
    ticket,
    loading: journeyLoading,
    error: journeyError,
    selectedDate,
    selectedTime,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    hasBookableDates,
    isAllDayTicket,
    canGoPrevMonth,
    canGoNextMonth,
    monthName,
    setSelectedDate,
    setSelectedTime,
    handlePrevMonth,
    handleNextMonth,
    getMinutesUntilClose,
    getSlotUrgency,
  } = useJourneySelectionController();

  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      alert('Please select a date');
      return;
    }
    const isAllDay = isAllDayTicket && !selectedTime;
    if (!isAllDay && !selectedTime) {
      alert('Please select a time slot');
      return;
    }
    if (!user) {
      alert('Please log in to continue');
      navigate('/login', { state: { returnTo: '/on-stage' } });
      return;
    }
    navigate('/payment', {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        date: toLocalDateString(selectedDate),
        time: selectedTime || 'all-day',
      },
    });
  };

  const processTouchStartX = useRef(0);
  const processTouchEndX = useRef(0);

  const {
    data: heroBanners = [],
    isLoading: heroLoading,
    error: heroError,
  } = useBanners('hero');
  const {
    data: processBanners = [],
    isLoading: processLoading,
    error: processError,
    refetch: refetchProcess,
  } = useBanners('process');
  const {
    data: sparkMapBanners = [],
    isLoading: sparkMapLoading,
    refetch: refetchSparkMap,
  } = useBanners('spark-map');

  const sparkMap = sparkMapBanners[0];

  const hasData = heroBanners.length > 0 || processBanners.length > 0;
  const loading = (heroLoading || processLoading) && !hasData;
  const error = heroError || processError;

  // Process banner auto-slide timer
  useEffect(() => {
    if (processBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentProcessSlide((p) => (p + 1) % processBanners.length);
    }, 5000); // 5 seconds auto-slide. You can change the '5000' here to any milliseconds you want.
    return () => clearInterval(interval);
  }, [processBanners.length]);

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
              refetchProcess();
              refetchSparkMap();
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
      <div className="relative z-20 pt-8 pb-4 bg-white">
        <div className="flex justify-center px-4">
          <a
            href="#select-journey"
            className="inline-block transition-transform hover:-translate-y-1 hover:drop-shadow-2xl active:translate-y-0 active:drop-shadow-lg duration-300"
          >
            <img 
              src="/images/landing/TICKET FIX.PNG"
              alt="BE A STAR Ticket" 
              className="w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto object-contain drop-shadow-xl"
            />
          </a>
        </div>
      </div>

      {/* Process Carousel (New Section) */}
      {processBanners.length > 0 && (
        <section className="w-full relative overflow-hidden bg-white mb-8 border-t border-b border-gray-100 pb-6 shadow-sm">
          {/* Title Image Overflow (Only shown for current active slide) */}
          <div className="flex justify-center mb-6 h-48 md:h-64 xl:h-96 transition-all duration-500 text-center relative z-20 mt-4 px-4">
            {processBanners[currentProcessSlide]?.title_image_url ? (
              <img 
                src={processBanners[currentProcessSlide].title_image_url!} 
                alt={processBanners[currentProcessSlide].title || 'Process Title Typography'} 
                className="h-full object-contain animate-fade-in drop-shadow-md"
              />
            ) : processBanners[currentProcessSlide]?.title ? (
              <h2 className="text-4xl md:text-6xl font-bold tracking-widest text-[#ff4b86] self-center animate-fade-in uppercase pt-4">
                {processBanners[currentProcessSlide].title}
              </h2>
            ) : null}
          </div>

          {/* Carousel Container */}
          <div className="relative w-full">
            <div
              className="overflow-hidden w-full relative"
              onTouchStart={(e) => { processTouchStartX.current = e.touches[0].clientX; }}
              onTouchMove={(e) => { processTouchEndX.current = e.touches[0].clientX; }}
              onTouchEnd={() => {
                const swipeThreshold = 50;
                const diff = processTouchStartX.current - processTouchEndX.current;
                if (Math.abs(diff) > swipeThreshold) {
                  if (diff > 0) setCurrentProcessSlide((p) => (p + 1) % processBanners.length);
                  else setCurrentProcessSlide((p) => (p - 1 + processBanners.length) % processBanners.length);
                }
              }}
            >
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{
                  transform: `translateX(-${currentProcessSlide * 100}%)`
                }}
              >
                {processBanners.map((processBanner) => (
                  <div key={processBanner.id} className="w-full flex-shrink-0">
                    <Link 
                      to={processBanner.link_url || '#'} 
                      className={`block w-full h-full ${!processBanner.link_url ? 'cursor-default pointer-events-none' : ''}`}
                    >
                      {/* Process Image */}
                      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-gray-100 dark:bg-gray-900">
                        {processBanner.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                          <video src={processBanner.image_url} className="w-full h-full object-cover pointer-events-none" autoPlay loop muted playsInline />
                        ) : (
                          <img src={processBanner.image_url} alt={processBanner.title || 'Process visual'} className="w-full h-full object-cover pointer-events-none" />
                        )}
                      </div>

                      {/* Process Subtitle Text */}
                      {processBanner.subtitle && (
                        <div className="p-6 md:p-8 text-center bg-white">
                          <p className="text-gray-800 font-medium md:text-2xl leading-relaxed whitespace-pre-wrap">
                            {processBanner.subtitle}
                          </p>
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons for Process Carousel */}
            {processBanners.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentProcessSlide((p) => (p - 1 + processBanners.length) % processBanners.length)}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-white/40 hover:bg-white/60 active:bg-white/80 text-main-600 p-2 md:p-4 rounded-full shadow-lg transition-colors touch-manipulation backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
                <button
                  onClick={() => setCurrentProcessSlide((p) => (p + 1) % processBanners.length)}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-white/40 hover:bg-white/60 active:bg-white/80 text-main-600 p-2 md:p-4 rounded-full shadow-lg transition-colors touch-manipulation backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </>
            )}
          </div>

          {/* Process Carousel Indicators */}
          {processBanners.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {processBanners.map((_, idx) => (
                <button
                  key={`process-dot-${idx}`}
                  onClick={() => setCurrentProcessSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full ux-transition-color touch-manipulation ${
                    currentProcessSlide === idx ? '#ff4b86' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Select Your Journey Section */}
      <section id="select-journey" className="bg-white py-12 md:py-16 scroll-mt-4">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="mb-10 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-3">{bookingCopy.journey_title}</h2>
            <p className="text-gray-600 text-base md:text-lg">{bookingCopy.journey_description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column: Calendar & Time Slots */}
            <div className="lg:col-span-2 flex flex-col gap-8 md:gap-10">
              {journeyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-main-600" />
                </div>
              ) : journeyError || !ticket ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-900">
                  {journeyError?.message || 'Entrance booking is unavailable right now.'}
                </div>
              ) : (
                <>
                  <JourneyCalendarSection
                    monthName={monthName}
                    canGoPrevMonth={canGoPrevMonth}
                    canGoNextMonth={canGoNextMonth}
                    calendarDays={calendarDays}
                    selectedDate={selectedDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                  />

                  <JourneyTimeSlotsSection
                    copy={bookingCopy}
                    selectedDate={selectedDate}
                    hasBookableDates={hasBookableDates}
                    isAllDayTicket={isAllDayTicket}
                    selectedTime={selectedTime}
                    availableSlotsCount={availableTimeSlots.length}
                    groupedSlots={groupedSlots}
                    onSelectTime={setSelectedTime}
                    getMinutesUntilClose={getMinutesUntilClose}
                    getSlotUrgency={getSlotUrgency}
                  />
                </>
              )}
            </div>

            {/* Right Column: Spark Map + Booking Summary */}
            <div className="flex flex-col gap-6">
              {/* Spark Map */}
              {sparkMapLoading ? (
                <div className="bg-gray-100 rounded-xl shadow-xl border border-gray-200 p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-600" />
                </div>
              ) : sparkMap ? (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 lg:p-8">
                  <h3 className="text-2xl font-black mb-5 italic">{sparkMap.title || 'Spark Map'}</h3>
                  {sparkMap.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                    <video
                      src={sparkMap.image_url}
                      className="w-full rounded-lg object-contain"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={sparkMap.image_url}
                      alt={sparkMap.title || 'Spark Stage 55 Map'}
                      className="w-full rounded-lg object-contain"
                    />
                  )}
                </div>
              ) : null}

              {/* Booking Summary */}
              {ticket && (
                <JourneySummaryCard
                  copy={bookingCopy}
                  ticket={ticket}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  isAllDayTicket={isAllDayTicket}
                  onProceed={handleProceedToPayment}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OnStage;
