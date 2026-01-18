const OnStage = () => {
  const stages = [
    {
      id: 1,
      title: 'The Boxing Ring',
      category: 'Industrial',
      tag: 'Set 01',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA',
      colSpan: 'lg:col-span-8',
      rowSpan: 'lg:row-span-2',
      height: 'h-[600px]',
    },
    {
      id: 2,
      title: 'The Bathtub',
      description: 'Natural light & porcelain textures.',
      icon: 'water_drop',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg',
      colSpan: 'lg:col-span-4',
      rowSpan: 'lg:row-span-2',
      height: 'h-[600px]',
    },
  ];

  const features = [
    {
      icon: 'flash_on',
      title: 'Lighting Included',
      description: 'Every booking includes basic Profoto strobe kits and c-stands. High-speed sync available.',
    },
    {
      icon: 'checkroom',
      title: 'Private Dressing',
      description: 'Dedicated makeup stations and changing areas for privacy. Steamer and rack included.',
    },
    {
      icon: 'chair',
      title: 'Props & Furniture',
      description: 'Access to our curated collection of mid-century modern pieces and velvet armchairs.',
    },
  ];

  return (
    <div className="bg-surface dark:bg-background-dark min-h-screen">
      {/* Header */}
      <header className="relative pt-24 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-12">
          <div className="max-w-4xl relative">
            <div className="absolute -left-8 top-0 h-full w-1 bg-primary hidden lg:block"></div>
            <span className="inline-block py-1 px-4 border border-primary text-primary text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
              Gallery
            </span>
            <h1 className="font-display text-6xl md:text-8xl text-text-light dark:text-text-dark font-medium leading-tight">
              The <span className="text-primary italic font-normal">Stages</span>
            </h1>
          </div>
          <div className="max-w-xs lg:text-right pb-4 border-l-2 border-primary lg:border-l-0 lg:border-r-2 pl-6 lg:pl-0 lg:pr-6">
            <p className="text-text-light dark:text-text-dark font-light text-sm leading-relaxed">
              Step into a world of curated sets. From industrial edges to bold red corners, every inch is designed for high-contrast artistry.
            </p>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-1 auto-rows-[minmax(300px,_auto)] border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 p-1">
          {/* The Boxing Ring */}
          <div className="group relative lg:col-span-8 lg:row-span-2 overflow-hidden bg-black h-[600px]">
            <img
              alt="Photographer in studio"
              className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-105 grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100"
              src={stages[0].image}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 left-0 p-10 w-full">
              <div className="flex items-center gap-4 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  {stages[0].tag}
                </span>
                <span className="text-white text-xs uppercase tracking-widest">{stages[0].category}</span>
              </div>
              <h2 className="text-white font-display text-5xl md:text-6xl italic">{stages[0].title}</h2>
            </div>
          </div>

          {/* The Bathtub */}
          <div className="group relative lg:col-span-4 lg:row-span-2 overflow-hidden bg-white dark:bg-surface-dark h-[600px]">
            <img
              alt="Beauty model close up"
              className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110 grayscale"
              src={stages[1].image}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 left-0 p-8 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <h2 className="text-white font-display text-4xl italic mb-2">{stages[1].title}</h2>
              <p className="text-white/90 text-sm font-light border-l-2 border-primary pl-3">
                {stages[1].description}
              </p>
            </div>
            <div className="absolute top-6 right-6 bg-primary text-white p-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
              <span className="material-symbols-outlined text-xl">{stages[1].icon}</span>
            </div>
          </div>

          {/* The Cyc Wall */}
          <div className="group relative lg:col-span-4 overflow-hidden bg-white dark:bg-surface-dark p-10 flex flex-col justify-between h-[400px]">
            <div className="flex justify-between items-start">
              <span className="font-display text-5xl text-primary font-bold opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                03
              </span>
              <div className="h-10 w-10 border border-gray-200 dark:border-gray-700 flex items-center justify-center rounded-full group-hover:border-primary group-hover:bg-primary transition-all duration-300">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">
                  crop_free
                </span>
              </div>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="font-display text-3xl text-gray-900 dark:text-white mb-3 font-medium">The Cyc Wall</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-light leading-relaxed">
                20ft infinity wall painted fresh white weekly. Perfect for e-commerce and high-key portraits.
              </p>
            </div>
            <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 mt-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-primary w-full -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out"></div>
            </div>
          </div>

          {/* The VIP Lounge */}
          <div className="group relative lg:col-span-4 overflow-hidden bg-gray-900 h-[400px]">
            <img
              alt="Fashion model"
              className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105 grayscale opacity-70 group-hover:opacity-100"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA588h4jJ4oHsovcFrCVzPKpp_UEjMxSSaafs_xzNqq498XDUCQpkVffgJCVjBFT85Msi-UXYkt5KQ8ZcHb6fzvA8mtRH7-hX0l8f1xMsXecfiYvU83maNSDjKeTD0W5bbAOX6LQyDRPar2Jpzg31Y5y9IwBfo7TkmpZbNGwcViuL7c7dOk0sa29H3Io-qLVN_XkNZwg_tVz3gP2wvtVBkmz-H-HRqYu8-JLTHlXNR3wZM_jcd8DttsIZO2CVe4K7GQadHKa6EfjYA"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent mix-blend-multiply opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
            <div className="absolute top-6 right-6">
              <div className="bg-white hover:bg-primary text-black hover:text-white transition-colors duration-300 p-3 shadow-lg cursor-pointer">
                <span className="material-symbols-outlined text-sm block">arrow_outward</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 p-8">
              <span className="text-white text-[10px] uppercase tracking-[0.3em] mb-2 block opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                Lounge Area
              </span>
              <h2 className="text-white font-display text-3xl font-medium tracking-wide">The VIP Lounge</h2>
            </div>
          </div>

          {/* The Vanity */}
          <div className="group relative lg:col-span-4 overflow-hidden bg-white dark:bg-surface-dark h-[400px] flex items-center justify-center text-center p-8 border-l border-gray-100 dark:border-gray-800">
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
              <svg width="100%" height="100%">
                <pattern id="pattern-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle className="text-primary" cx="2" cy="2" r="1.5" fill="currentColor"></circle>
                </pattern>
                <rect width="100%" height="100%" fill="url(#pattern-dots)"></rect>
              </svg>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            <div className="relative z-10">
              <span className="material-symbols-outlined text-5xl text-primary mb-6 block transform group-hover:-translate-y-2 transition-transform duration-300">
                face_3
              </span>
              <h3 className="font-display text-3xl text-gray-900 dark:text-white mb-4 font-medium">The Vanity</h3>
              <a
                className="inline-block text-xs uppercase tracking-widest font-bold border-b-2 border-transparent hover:border-primary hover:text-primary pb-1 transition-all duration-300"
                href="#"
              >
                View Amenities
              </a>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 border-t border-gray-100 dark:border-gray-800 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600 mb-4 group-hover:text-primary transition-colors">
                  {feature.icon}
                </span>
                <h4 className="font-display text-xl mb-3 text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnStage;
