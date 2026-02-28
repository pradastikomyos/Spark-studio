import { useState } from 'react';
import { useBanners } from '../hooks/useBanners';
import { HeroBannerCarousel } from '../components/HeroBannerCarousel';
import { useEventSchedule } from '../hooks/useEventSchedule';
import { EventScheduleCard } from '../components/events/EventScheduleCard';

const Events = () => {
  const [activeFilter, setActiveFilter] = useState('Events');

  const { data: eventsBanners = [], isLoading: bannersLoading } = useBanners('events');
  const { data: schedule = [], isLoading: scheduleLoading, error: scheduleError } = useEventSchedule();

  const filters = ['Events'];
  // , 'Workshops', 'Exhibitions', 'Masterclass' (punya atas)

  if (bannersLoading || scheduleLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Header with Slider */}
      <header className="relative w-full h-[500px] overflow-hidden">
        {eventsBanners.length > 0 ? (
          <HeroBannerCarousel
            slides={eventsBanners}
            intervalMs={5000}
            containerClassName="relative h-full"
            imageClassName="w-full h-full object-cover opacity-80"
            prevButtonClassName="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full ux-transition-color"
            nextButtonClassName="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full ux-transition-color"
            indicatorActiveClassName="bg-primary"
            indicatorInactiveClassName="bg-white/50 hover:bg-white/70"
            overlayClassName="absolute inset-0"
            renderOverlay={(slide) => (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-4 max-w-7xl mx-auto">
                  <div className="max-w-3xl pl-4 sm:pl-6 lg:pl-8">
                    <span className="inline-block py-1 px-3 border border-primary/30 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-6 bg-white/80 backdrop-blur-sm shadow-sm">
                      Curated Experiences
                    </span>
                    <h1 className="font-display text-6xl md:text-7xl text-text-light font-bold mb-6 leading-tight">
                      {slide.title}
                    </h1>
                    {slide.subtitle ? (
                      <p className="text-subtext-light text-lg font-light max-w-lg leading-relaxed">{slide.subtitle}</p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          />
        ) : (
          // Fallback to static banner if no banners in database
          <>
            <div className="absolute inset-0 bg-gray-50">
              <img
                alt="Studio atmosphere"
                className="w-full h-full object-cover opacity-80"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-center px-4 max-w-7xl mx-auto">
              <div className="max-w-3xl pl-4 sm:pl-6 lg:pl-8">
                <span className="inline-block py-1 px-3 border border-primary/30 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-6 bg-white/80 backdrop-blur-sm shadow-sm">
                  Curated Experiences
                </span>
                <h1 className="font-display text-6xl md:text-7xl text-text-light font-bold mb-6 leading-tight">
                  Workshops <br />
                  <span className="italic font-light text-primary">&amp; Events</span>
                </h1>
                <p className="text-subtext-light text-lg font-light max-w-lg leading-relaxed">
                  Join our community of artists for exclusive masterclasses, portfolio building sessions, and gallery exhibitions.
                </p>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-gray-100 pb-8">
          <div>
            <h2 className="font-display text-4xl font-semibold text-text-light mb-2">
              Upcoming Schedule
            </h2>
            <p className="text-subtext-light font-light">
              Explore our season of artistic gatherings.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all ${activeFilter === filter
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-primary hover:text-primary'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {scheduleError ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700">
                {scheduleError instanceof Error ? scheduleError.message : 'Failed to load events schedule'}
              </p>
            </div>
          ) : schedule.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-gray-100 bg-gray-50 p-10 text-center">
              <p className="text-sm text-gray-500">No upcoming schedule yet.</p>
            </div>
          ) : (
            schedule.map((item) => <EventScheduleCard key={item.id} item={item} />)
          )}

          {/* Private Session Card */}
          <article className="group bg-white rounded-2xl overflow-hidden border border-dashed border-gray-200 hover:border-solid hover:border-primary/20 shadow-sm hover:shadow-xl hover:shadow-primary/10:shadow-primary/5 transition-all duration-500 flex flex-col justify-center items-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300 text-primary shadow-sm">
                <span className="material-symbols-outlined text-2xl">add</span>
              </div>
              <h3 className="font-display text-xl font-bold text-text-light mb-2">
                Private Session
              </h3>
              <p className="text-sm font-light text-subtext-light mb-6">
                Book a private workshop or studio time tailored to your needs.
              </p>
              <a
                className="inline-block border-b border-primary text-primary pb-1 text-sm font-bold hover:text-gray-900:text-white hover:border-gray-900:border-white transition-all"
                href="#"
              >
                Contact Us
              </a>
            </div>
          </article>
        </div>

        {/* Newsletter Section
        <section className="bg-gray-50 rounded-[2rem] p-12 md:p-20 text-center relative overflow-hidden border border-gray-100">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-9xl text-primary">star</span>
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-text-light mb-4">
              Stay Inspired
            </h2>
            <p className="text-subtext-light mb-10 font-light">
              Be the first to know about new workshops, gallery openings, and special studio events.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                className="flex-grow px-6 py-4 rounded-full border-gray-200 bg-white text-text-light placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow shadow-sm"
                placeholder="Email address"
                required
                type="email"
              />
              <button
                className="bg-gray-900#ff4b86] hover:bg-[#ff4b86]:bg-[#e63d75] text-white px-8 py-4 rounded-full font-bold transition-all duration-300 shadow-lg shadow-gray-200/50 hover:shadow-primary/30"
                type="submit"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section> */}
      </main>
    </div>
  );
};

export default Events;
