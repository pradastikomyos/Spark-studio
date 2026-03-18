import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { DEFAULT_CHARM_BAR_PAGE_SETTINGS, useCharmBarSettings } from '../hooks/useCharmBarSettings';

export default function CharmBar() {
  const { settings } = useCharmBarSettings();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const content = settings ?? DEFAULT_CHARM_BAR_PAGE_SETTINGS;

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
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-8">
            {content.quick_links.map((item) => (
              <Link
                key={item.title}
                to={item.href || '/shop'}
                className="group text-center"
              >
                <div className="mx-auto mb-4 aspect-square w-full max-w-[150px] overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.07)] transition-transform duration-300 group-hover:-translate-y-1">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] underline decoration-black/60 decoration-1 underline-offset-[5px]">
                  {item.title}
                </p>
                <p className="mx-auto mt-3 max-w-[13rem] text-sm leading-6 text-black/60">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-10 lg:px-12">
          <div className="mx-auto mb-10 h-px w-40 bg-black/30" />
          <div className="mb-12 text-center">
            <h2 className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl">
              {content.customize_title}
            </h2>
          </div>

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-14">
            {content.steps.map((step) => (
              <article key={step.title} className="flex h-full flex-col text-center">
                <div className="mb-8 overflow-hidden bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
                  <img src={step.image_url} alt={step.title} className="aspect-[4/5] w-full object-cover" />
                </div>
                <h3 className="font-serif text-[2rem] font-black uppercase leading-[1.05] sm:text-[2.2rem]">
                  {step.title}
                </h3>
                <p className="mx-auto mt-6 max-w-sm text-base leading-7 text-black/70">
                  {step.body}
                </p>
                <div className="mt-8">
                  <Link
                    to={step.cta_href || '/shop'}
                    className="inline-flex items-center justify-center bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#ff4b86]"
                  >
                    {step.cta_label}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/50">
              {content.video_intro_text}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {content.video_cards.map((video, index) => (
              <div
                key={video.title}
                className={`group relative overflow-hidden bg-[#d9d9d9] shadow-[0_22px_50px_rgba(0,0,0,0.1)] ${
                  index === 1 ? 'md:-translate-y-4' : ''
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
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover:scale-105">
                    <Play className="ml-1 h-7 w-7 fill-current" />
                  </span>
                </div>
                <div className="absolute left-5 top-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
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
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 text-center text-white">
                  <span className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl">
                    Auto play
                    <br />
                    video
                  </span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover:scale-105">
                    <Play className="ml-1 h-7 w-7 fill-current" />
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-8 text-center lg:text-left">
              <h2 className="font-serif text-4xl font-black uppercase leading-none sm:text-5xl">
                {content.how_it_works_title}
              </h2>
              <div className="space-y-5 text-lg leading-8 text-black/75">
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
