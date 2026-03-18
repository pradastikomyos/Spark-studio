import { useEventSettings } from '../hooks/useEventSettings';

const Events = () => {
  const { settings, isLoading: settingsLoading } = useEventSettings();

  if (settingsLoading) {
    return (
      <div className="bg-background-light min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fallback content if settings are empty/not configured
  const heroImages = settings?.hero_images?.filter(Boolean) || [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80',
  ];

  const magicTitle = settings?.magic_title || 'CAPTURING your MAGIC MOMENT';
  const magicDesc = settings?.magic_description || 'Hey, I\'m Jonny Lou, luxury and destination wedding photographer. I\'m a storyteller with a camera, capturing the magic of love in weddings and portraits. More than just wedding photos and portraits, I create lasting memories that celebrate the enduring power of love.';
  const magicBtnText = settings?.magic_button_text || 'LEARN MORE';
  const magicBtnLink = settings?.magic_button_link || '#';
  const magicImages = settings?.magic_images?.filter(Boolean) || [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
  ];

  const expTitle = settings?.experience_title || 'CHOOSE your EXPERIENCE';
  const expImages = settings?.experience_images?.filter(Boolean) || [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80',
  ];
  
  const expLinks = settings?.experience_links || [
    { title: '1.', subtitle: 'THE GALLERIES', link: '#' },
    { title: '2.', subtitle: 'MY SERVICES', link: '#' },
    { title: '3.', subtitle: 'CONTACT ME', link: '#' },
  ];

  return (
    <div className="bg-[#fcfcf9] min-h-screen text-gray-900 selection:bg-primary/20">
      
      {/* 1. Hero Gallery Row (Dynamic Layout) */}
      <section className="w-full h-[50vh] md:h-[65vh] flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        
        {/* 2. Capturing Magic Moment Section */}
        <section className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-32">
          <div className="flex-1 max-w-xl">
            <h1 
              className="font-script text-5xl sm:text-6xl lg:text-7xl text-gray-800 leading-none mb-8 whitespace-pre-line"
            >
              {magicTitle.toLowerCase() === 'every moment deserves to spark' ? 'Every moment\ndeserves to Spark' : magicTitle}
            </h1>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-10 font-light">
              {magicDesc}
            </p>
            {magicBtnText && (
              <a 
                href={magicBtnLink} 
                className="inline-block border border-gray-300 px-8 py-3 text-xs tracking-widest uppercase hover:bg-gray-900 hover:text-white transition-colors duration-300"
              >
                {magicBtnText}
              </a>
            )}
          </div>
          
          <div className="flex-1 w-full flex justify-center md:justify-end">
            <div className="relative w-full max-w-md aspect-[3/4]">
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
        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end">
            {expImages.map((img, idx) => {
              // Create an interesting staggered layout like the sketch
              const heights = ['aspect-square', 'aspect-[3/4]', 'aspect-[4/5]'];
              const margins = ['mb-0', 'mb-12', 'mb-0'];
              
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
        <section className="text-center mb-40">
          <h2 className="font-display text-3xl md:text-4xl text-gray-800 mb-16">
            {expTitle.split(' ').map((word, i) => {
              const isItalic = word.toLowerCase() === 'your';
              return (
                <span key={i} className={isItalic ? 'italic font-light' : 'font-normal'}>
                  {word}{' '}
                </span>
              );
            })}
          </h2>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-300">
            {expLinks.map((link, idx) => (
              <a 
                href={link.link || '#'} 
                key={idx}
                className="group px-12 py-6 md:py-0 text-center hover:opacity-70 transition-opacity"
              >
                <div className="font-display text-2xl mb-4 text-gray-800">{link.title}</div>
                <div className="text-[10px] tracking-[0.2em] font-bold text-gray-400 uppercase">{link.subtitle}</div>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Events;
