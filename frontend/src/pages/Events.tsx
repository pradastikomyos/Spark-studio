import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';

interface Event {
  id: number;
  title: string;
  description: string;
  date: {
    month: string;
    day: number;
  };
  time: string;
  category: string;
  image?: string;
  placeholder?: string;
  buttonText: string;
}

const Events = () => {
  const [activeFilter, setActiveFilter] = useState('All Events');
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  const { data: eventsBanners = [], isLoading: bannersLoading } = useBanners('events');

  const events: Event[] = [
    {
      id: 1,
      title: 'Fashion Editorial Lighting',
      description: 'Master the art of high-fashion lighting setups with our lead studio director. Learn to shape light for dramatic effect.',
      date: { month: 'Oct', day: 12 },
      time: '10:00 AM - 4:00 PM',
      category: 'Workshop',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA588h4jJ4oHsovcFrCVzPKpp_UEjMxSSaafs_xzNqq498XDUCQpkVffgJCVjBFT85Msi-UXYkt5KQ8ZcHb6fzvA8mtRH7-hX0l8f1xMsXecfiYvU83maNSDjKeTD0W5bbAOX6LQyDRPar2Jpzg31Y5y9IwBfo7TkmpZbNGwcViuL7c7dOk0sa29H3Io-qLVN_XkNZwg_tVz3gP2wvtVBkmz-H-HRqYu8-JLTHlXNR3wZM_jcd8DttsIZO2CVe4K7GQadHKa6EfjYA',
      buttonText: 'Register',
    },
    {
      id: 2,
      title: 'Beauty & Skin Retouching',
      description: 'A comprehensive guide to natural skin retouching and color grading for beauty photography.',
      date: { month: 'Oct', day: 18 },
      time: '1:00 PM - 5:00 PM',
      category: 'Seminar',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg',
      buttonText: 'Register',
    },
    {
      id: 3,
      title: 'The Analog Experience',
      description: 'Return to the roots of photography. Hands-on film development session in our darkroom.',
      date: { month: 'Nov', day: 5 },
      time: '11:00 AM - 6:00 PM',
      category: 'Masterclass',
      placeholder: 'photo_camera',
      buttonText: 'Register',
    },
    {
      id: 4,
      title: 'Shadows & Light Gallery',
      description: 'Opening night for our resident artists. Wine and cheese reception included.',
      date: { month: 'Nov', day: 12 },
      time: '7:00 PM - 10:00 PM',
      category: 'Exhibition',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA',
      buttonText: 'RSVP',
    },
    {
      id: 5,
      title: 'Color Theory in Set Design',
      description: 'Understanding how color palettes influence the mood of your photography.',
      date: { month: 'Nov', day: 24 },
      time: '2:00 PM - 5:00 PM',
      category: 'Workshop',
      placeholder: 'palette',
      buttonText: 'Register',
    },
  ];

  // Auto-advance hero slider every 5 seconds
  useEffect(() => {
    if (eventsBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % eventsBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [eventsBanners.length]);

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % eventsBanners.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + eventsBanners.length) % eventsBanners.length);
  };

  const filters = ['Events'];
  // , 'Workshops', 'Exhibitions', 'Masterclass' (punya atas)

  if (bannersLoading) {
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
          <>
            {/* Hero Slides */}
            <div className="relative h-full">
              {eventsBanners.map((slide, index) => (
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
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent"></div>

                  {/* Hero Content */}
                  <div className="absolute inset-0 flex flex-col justify-center px-4 max-w-7xl mx-auto">
                    <div className="max-w-3xl pl-4 sm:pl-6 lg:pl-8">
                      <span className="inline-block py-1 px-3 border border-primary/30 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-6 bg-white/80 backdrop-blur-sm shadow-sm">
                        Curated Experiences
                      </span>
                      <h1 className="font-display text-6xl md:text-7xl text-text-light font-bold mb-6 leading-tight animate-fade-in">
                        {slide.title}
                      </h1>
                      {slide.subtitle && (
                        <p className="text-subtext-light text-lg font-light max-w-lg leading-relaxed animate-fade-in-delay">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hero Navigation Buttons */}
            {eventsBanners.length > 1 && (
              <>
                <button
                  onClick={prevHeroSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full transition-all"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextHeroSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-900 p-3 rounded-full transition-all"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Hero Indicators */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                  {eventsBanners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentHeroSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentHeroSlide === index ? 'bg-primary w-8' : 'bg-white/50'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
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
          {events.map((event) => (
            <article
              key={event.id}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary/10:shadow-primary/5 transition-all duration-500 flex flex-col relative"
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-4 right-4 z-10 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Coming Soon
              </div>
              
              <div className="relative h-64 overflow-hidden">
                {event.image ? (
                  <img
                    alt={event.title}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${event.id === 4 ? 'grayscale hover:grayscale-0' : ''
                      }`}
                    src={event.image}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
                    {event.placeholder === 'photo_camera' && (
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage: 'radial-gradient(#ff4b86 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      ></div>
                    )}
                    <div className="text-center z-10">
                      <span className="material-symbols-outlined text-6xl text-primary/40">
                        {event.placeholder}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-center py-2 px-3 rounded-lg shadow-sm border border-gray-100">
                  <span className="block text-xs uppercase font-bold text-gray-400">
                    {event.date.month}
                  </span>
                  <span className="block text-xl font-display font-bold text-primary">{event.date.day}</span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span
                    className={`${event.category === 'Workshop' || event.category === 'Masterclass'
                      ? 'bg-primary'
                      : 'bg-gray-900'
                      } text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md`}
                  >
                    {event.category}
                  </span>
                </div>
              </div>
              <div className="p-8 flex-grow flex flex-col">
                <div className="mb-4">
                  <h3 className="font-display text-2xl font-bold text-text-light mb-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm font-light text-subtext-light line-clamp-2">
                    {event.description}
                  </p>
                </div>
                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-base mr-1">schedule</span>
                    {event.time}
                  </div>
                  <button 
                    disabled
                    className="text-gray-400 font-bold text-sm cursor-not-allowed flex items-center gap-1 opacity-50"
                  >
                    {event.buttonText}
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}

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
