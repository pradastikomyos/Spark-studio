import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { DEFAULT_CHARM_BAR_PAGE_SETTINGS, useCharmBarSettings } from '../hooks/useCharmBarSettings';
import { getCmsFontStyle } from '../lib/cmsTypography';

export default function CharmBar() {
  const { settings } = useCharmBarSettings();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => prev + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const content = settings ?? DEFAULT_CHARM_BAR_PAGE_SETTINGS;
  const quickLinksFonts = content.section_fonts.quick_links;
  const customizeFonts = content.section_fonts.customize;
  const videoGalleryFonts = content.section_fonts.video_gallery;
  const howItWorksFonts = content.section_fonts.how_it_works;

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#fcfaf7] text-[#111111]">
        <section className="overflow-hidden border-b border-black/10 bg-white">
          <div className="mx-auto max-w-[1680px]">
            <div className="relative bg-[linear-gradient(180deg,#efe6e4_0%,#f4eeeb_100%)]">
              <img
                src={content.hero_image_url}
                alt="Charm bar hero"
                className="aspect-[16/8.6] w-full object-cover object-center"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-16 lg:px-12">
          <div className="grid grid-cols-5 gap-1.5 md:gap-4 lg:gap-8">
            {content.quick_links.map((item) => (
              <Link
                key={item.title}
                to={item.href || '/shop'}
                className="group text-center"
              >
                <div className="mx-auto mb-2 relative aspect-square w-full max-w-[150px] overflow-hidden rounded-[20%] border border-black/10 bg-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1 lg:mb-4 lg:rounded-[1.75rem] lg:shadow-[0_16px_40px_rgba(0,0,0,0.07)]">
                  {(() => {
                    const images = item.image_urls?.length ? item.image_urls : [item.image_url];
                    return images.map((img, idx) => {
                      const isActive = idx === (activeImageIndex % images.length);
                      return (
                        <img
                          key={idx}
                          src={img || item.image_url} // fallback in case of empty string
                          alt={`${item.title} ${idx + 1}`}
                          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105 ${
                            isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                          }`}
                        />
                      );
                    });
                  })()}
                </div>
                <p
                  className="text-[8px] font-bold uppercase leading-tight tracking-[0.05em] underline decoration-black/60 decoration-1 underline-offset-[2px] sm:text-[10px] lg:text-[13px] lg:leading-normal lg:tracking-[0.12em] lg:underline-offset-[5px]"
                  style={getCmsFontStyle(quickLinksFonts.heading)}
                >
                  {item.title}
                </p>
                <p className="mx-auto mt-1 hidden max-w-[13rem] text-xs leading-4 text-black/60 md:block lg:mt-3 lg:text-sm lg:leading-6" style={getCmsFontStyle(quickLinksFonts.body)}>
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-10 lg:px-12">
          <div className="mx-auto mb-10 h-px w-40 bg-black/30" />
          <div className="mb-12 text-center">
            <h2 className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl" style={getCmsFontStyle(customizeFonts.heading)}>
              {content.customize_title}
            </h2>
          </div>

          <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:overflow-visible md:px-0">
            <div className="min-w-[880px] md:min-w-0">
              <div className="grid grid-cols-3 gap-14">
                {content.steps.map((step) => (
                  <article key={step.title} className="flex h-full flex-col text-center">
                    <div className="mb-8 overflow-hidden bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
                      <img src={step.image_url} alt={step.title} className="aspect-[4/5] w-full object-cover" />
                    </div>
                    <h3 className="font-serif text-[2.2rem] font-black uppercase leading-[1.1]" style={getCmsFontStyle(customizeFonts.heading)}>
                      {step.title}
                    </h3>
                    <p className="mx-auto mt-6 max-w-sm text-base leading-7 text-black/70" style={getCmsFontStyle(customizeFonts.body)}>
                      {step.body}
                    </p>
                    <div className="mt-8">
                      <Link
                        to={step.cta_href || '/shop'}
                        className="inline-flex items-center justify-center bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#ff4b86]"
                        style={getCmsFontStyle(customizeFonts.body)}
                      >
                        {step.cta_label}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/50" style={getCmsFontStyle(videoGalleryFonts.body)}>
              {content.video_intro_text}
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.14fr)_minmax(0,0.78fr)] items-center gap-3 md:gap-8">
            {content.video_cards.map((video, index) => (
              <div
                key={video.title}
                className={`group relative overflow-hidden bg-[#d9d9d9] shadow-[0_8px_20px_rgba(0,0,0,0.06)] md:shadow-[0_22px_50px_rgba(0,0,0,0.1)] ${
                  index === 1 ? 'scale-[1.04]' : ''
                }`}
              >
                <video
                  src={video.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-black/10" />
                <div className="absolute left-2 top-2 text-[7px] font-semibold uppercase tracking-[0.1em] text-white sm:text-[9px] md:left-5 md:top-5 md:text-[11px] md:tracking-[0.24em]" style={getCmsFontStyle(videoGalleryFonts.heading)}>
                  {video.title}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 pb-20 md:px-10 lg:px-12 lg:pb-24">
          <div className="mx-auto mb-10 h-px w-40 bg-black/30" />
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
            <div className="overflow-hidden bg-[#d9d9d9] shadow-[0_24px_65px_rgba(0,0,0,0.12)]">
              <div className="group relative">
                <video
                  src={content.how_it_works_video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/18" />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <span className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl" style={getCmsFontStyle(howItWorksFonts.heading)}>
                    {/* Auto play
                    <br />
                    video */}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-8 text-center lg:text-left">
              <h2 className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl" style={getCmsFontStyle(howItWorksFonts.heading)}>
                {content.how_it_works_title}
              </h2>
              <div className="space-y-5 text-lg leading-8 text-black/75" style={getCmsFontStyle(howItWorksFonts.body)}>
                <p className="font-semibold text-black">
                  {content.how_it_works_intro}
                </p>
                <ol className="space-y-1 text-base sm:text-lg">
                  {content.how_it_works_steps.map((step, index) => (
                    <li key={`${index + 1}-${step}`}>{index + 1}. {step}</li>
                  ))}
                </ol>
              </div>
              <Link
                to={content.how_it_works_cta_href || '/shop'}
                className="inline-flex items-center justify-center gap-2 border border-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:border-[#ff4b86] hover:text-[#ff4b86]"
                style={getCmsFontStyle(howItWorksFonts.body)}
              >
                {content.how_it_works_cta_label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
