import { useEffect, useMemo, useState } from 'react';

type HeroSlide = {
  imageSrc: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

const Hero = () => {
  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        imageSrc: '/images/landing/neon.png',
        title: 'Welcome to SPARK',
        subtitle: 'come and see the magic',
        ctaLabel: "Let's go!",
        ctaHref: '#tickets',
      },
      {
        imageSrc: '/images/landing/neon.png',
        title: 'Enter the Stage World',
        subtitle: 'choose your access pass and time slot',
        ctaLabel: "Let's go!",
        ctaHref: '#tickets',
      },
      {
        imageSrc: '/images/landing/neon.png',
        title: 'Your Magic Starts Here',
        subtitle: 'tickets, experiences, and store in one place',
        ctaLabel: "Let's go!",
        ctaHref: '#tickets',
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActiveIndex((i) => (i + 1) % slides.length), 5000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const active = slides[activeIndex];

  return (
    <header className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="border border-gray-200 overflow-hidden">
          <div className="relative">
            <img alt={active.title} className="w-full h-[520px] object-cover" src={active.imageSrc} />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-white text-3xl md:text-5xl font-black">{active.title}</h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">{active.subtitle}</p>
              <p className="mt-6 text-white text-lg md:text-xl font-semibold">
                {active.ctaLabel}
              </p>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 w-2 rounded-full border border-white/70 ${idx === activeIndex ? 'bg-white' : 'bg-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
