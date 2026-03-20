import { DEFAULT_EVENT_PAGE_SETTINGS, useEventSettings } from '../hooks/useEventSettings';
import { getCmsFontStyle } from '../lib/cmsTypography';

const Events = () => {
  const { settings, isLoading: settingsLoading } = useEventSettings();

  if (settingsLoading) {
    return (
      <div className="bg-background-light min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const content = settings ?? DEFAULT_EVENT_PAGE_SETTINGS;
  const heroImages = content.hero_images.filter(Boolean);
  const magicTitle = content.magic_title;
  const magicDesc = content.magic_description;
  const magicBtnText = content.magic_button_text;
  const magicBtnLink = content.magic_button_link;
  const magicImages = content.magic_images.filter(Boolean);
  const expTitle = content.experience_title;
  const expImages = content.experience_images.filter(Boolean);
  const expLinks = content.experience_links;
  const magicFonts = content.section_fonts.magic;
  const experienceFonts = content.section_fonts.experience;

  return (
    <div className="bg-[#fcfcf9] min-h-screen text-gray-900 selection:bg-primary/20">
      
      {/* 1. Hero Gallery Row (Dynamic Layout) */}
      <section className="flex h-[42vh] w-full snap-x snap-mandatory overflow-x-auto hide-scrollbar sm:h-[50vh] md:h-[65vh]">
        {heroImages.map((img, idx) => (
          <div 
            key={idx} 
            className="flex-none h-full border-r border-[#fcfcf9]/20 last:border-0 relative group snap-start bg-gray-100"
            style={{ width: `${100 / Math.min(5, Math.max(1, heroImages.length))}vw` }}
          >
            <img 
              src={img} 
              alt={`Gallery ${idx + 1}`} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              onError={(e) => { 
                // Hide completely or replace with a placeholder if it breaks
                e.currentTarget.style.display = 'none'; 
              }}
            />
          </div>
        ))}
      </section>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-32">
        
        {/* 2. Capturing Magic Moment Section */}
        <section className="mb-20 grid grid-cols-[minmax(0,1.2fr)_minmax(7rem,0.8fr)] items-start gap-4 sm:mb-32 sm:flex sm:items-center sm:gap-12 md:gap-24">
          <div className="min-w-0 flex-1 max-w-xl">
            <h1 
              className="mb-4 text-[2rem] leading-none text-gray-800 whitespace-pre-line sm:mb-8 sm:text-6xl lg:text-7xl"
              style={getCmsFontStyle(magicFonts.heading)}
            >
              {magicTitle.toLowerCase() === 'every moment deserves to spark' ? 'Every moment\ndeserves to Spark' : magicTitle}
            </h1>
            <p className="mb-5 text-[11px] leading-relaxed font-light text-gray-500 sm:mb-10 sm:text-base" style={getCmsFontStyle(magicFonts.body)}>
              {magicDesc}
            </p>
            {magicBtnText && (
              <a 
                href={magicBtnLink} 
                className="inline-block border border-gray-300 px-4 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-gray-900 hover:text-white sm:px-8 sm:text-xs sm:tracking-widest"
                style={getCmsFontStyle(magicFonts.body)}
              >
                {magicBtnText}
              </a>
            )}
          </div>
          
          <div className="flex justify-end sm:flex-1">
            <div className="relative aspect-[3/4] w-full max-w-[8.5rem] sm:max-w-md">
              {magicImages[0] && (
                <img 
                  src={magicImages[0]} 
                  alt="Magic moment text accompanying image" 
                  className="w-full h-full object-cover shadow-xl"
                />
              )}
            </div>
          </div>
        </section>

        {/* 3. Image Collage (3 images side by side layout) */}
        <section className="mb-20 sm:mb-32">
          <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-6 md:gap-8">
            {expImages.map((img, idx) => {
              // Create an interesting staggered layout like the sketch
              const heights = ['aspect-square', 'aspect-[3/4]', 'aspect-[4/5]'];
              const margins = ['mb-0', 'mb-6 sm:mb-12', 'mb-0'];
              
              return (
                <div key={idx} className={`w-full ${margins[idx % 3]}`}>
                  <img 
                    src={img} 
                    alt={`Experience ${idx + 1}`} 
                    className={`w-full object-cover ${heights[idx % 3]} shadow-sm`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Choose Your Experience Links */}
        <section className="mb-24 text-center sm:mb-40">
          <h2 className="mb-10 text-2xl text-gray-800 sm:mb-16 sm:text-3xl md:text-4xl" style={getCmsFontStyle(experienceFonts.heading)}>
            {expTitle.split(' ').map((word, i) => {
              const isItalic = word.toLowerCase() === 'your';
              return (
                <span key={i} className={isItalic ? 'italic font-light' : 'font-normal'}>
                  {word}{' '}
                </span>
              );
            })}
          </h2>
          
          <div className="flex items-stretch justify-center divide-x divide-gray-300">
            {expLinks.map((link, idx) => (
              <a 
                href={link.link || '#'} 
                key={idx}
                className="group min-w-0 flex-1 px-2 py-3 text-center transition-opacity hover:opacity-70 sm:px-12 sm:py-6 md:py-0"
              >
                <div className="mb-2 text-lg text-gray-800 sm:mb-4 sm:text-2xl" style={getCmsFontStyle(experienceFonts.heading)}>{link.title}</div>
                <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-gray-400 sm:text-[10px] sm:tracking-[0.2em]" style={getCmsFontStyle(experienceFonts.body)}>{link.subtitle}</div>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Events;
