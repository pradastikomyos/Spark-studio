const Hero = () => {
  return (
    <header className="relative w-full h-screen min-h-[700px] bg-background-dark overflow-hidden group">
      <div className="absolute inset-0 z-0">
        <img
          alt="Dramatic photography studio portrait with high contrast lighting"
          className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-[3s] ease-in-out"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-background-dark"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="mb-8 animate-fade-in-up opacity-0">
          <span className="inline-block py-1.5 px-4 rounded-full text-[11px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default">
            SPARK STAGE 55
          </span>
        </div>

        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-white font-medium mb-6 tracking-tight leading-[0.9] drop-shadow-2xl">
          <div className="overflow-hidden">
            <span className="block animate-fade-in-up delay-100 opacity-0">ON STAGE</span>
          </div>
          <span className="font-light text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/50 relative inline-block text-4xl md:text-6xl lg:text-7xl mt-2 animate-fade-in-up delay-200 opacity-0 italic font-display">
            A Star Living Action Mode
            <div className="absolute -top-8 -right-12 w-16 h-16 animate-pulse hidden md:block">
              <svg className="w-full h-full text-white/80 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
              </svg>
            </div>
          </span>
        </h1>

        <p className="max-w-xl text-white/70 text-sm md:text-base leading-relaxed mb-10 animate-fade-in-up delay-300 opacity-0 font-light tracking-wide">
          Step into the spotlight with curated fashion, cosmetic, and glamour.
          Where every moment is crafted to make you the star.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up delay-300 opacity-0">
          <a
            className="group relative px-8 py-4 bg-white text-black text-xs uppercase tracking-widest font-bold overflow-hidden transition-all hover:scale-105"
            href="#tickets"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="relative z-10 flex items-center gap-2">
              Let Be a Star
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </span>
          </a>
          <a
            className="px-8 py-4 bg-transparent border border-white/20 text-white text-xs uppercase tracking-widest font-bold hover:bg-white/5 hover:border-white/40 transition-all hover:scale-105 backdrop-blur-sm"
            href="#gallery"
          >
            Explore Stage
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
        <span className="text-[9px] uppercase tracking-[0.3em] text-white mb-2">Scroll</span>
        <span className="material-symbols-outlined text-white font-thin">keyboard_arrow_down</span>
      </div>
    </header>
  );
};

export default Hero;
