const Hero = () => {
  return (
    <header className="relative w-full h-screen min-h-[700px] bg-background-dark overflow-hidden group">
      <div className="absolute inset-0 z-0">
        <img
          alt="Dramatic photography studio portrait with high contrast lighting"
          className="w-full h-full object-cover opacity-80 scale-100 group-hover:scale-105 transition-transform duration-[2s] ease-in-out"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-background-dark"></div>
      </div>
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="mb-6">
          <span className="inline-block py-1 px-3 border border-white/30 rounded-full text-[10px] uppercase tracking-widest text-white backdrop-blur-sm">
            Premium Studio Experience
          </span>
        </div>
        <h1 className="font-display text-7xl md:text-9xl text-white font-medium mb-2 tracking-tight leading-[0.9]">
          Capturing <br />
          <span className="italic font-light text-primary relative inline-block">
            Soul
            <svg className="absolute -top-6 -right-8 w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
            </svg>
          </span>
        </h1>
        <p className="text-gray-300 text-lg md:text-xl max-w-xl font-light mb-10 leading-relaxed mt-6">
          Where artistry meets precision. Spark Photo Studio crafts visual narratives that resonate with elegance and timeless emotion.
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <a
            className="bg-primary hover:bg-primary-dark text-white px-10 py-4 rounded-sm text-xs uppercase tracking-widest font-bold transition-all transform hover:-translate-y-1 shadow-lg shadow-primary/30"
            href="#tickets"
          >
            Book Session
          </a>
          <a
            className="bg-transparent border border-white/30 hover:border-white text-white hover:bg-white hover:text-black px-10 py-4 rounded-sm text-xs uppercase tracking-widest font-bold transition-all backdrop-blur-sm"
            href="#"
          >
            Explore Gallery
          </a>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce opacity-50">
        <span className="text-[10px] uppercase tracking-widest text-white mb-2">Scroll</span>
        <span className="material-symbols-outlined text-white">keyboard_arrow_down</span>
      </div>
    </header>
  );
};

export default Hero;
