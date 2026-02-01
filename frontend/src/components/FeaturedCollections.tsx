import { CollectionItem } from '../types';

const FeaturedCollections = () => {
  const collections: CollectionItem[] = [
    {
      title: 'Fashion',
      subtitle: 'View Editorial',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA588h4jJ4oHsovcFrCVzPKpp_UEjMxSSaafs_xzNqq498XDUCQpkVffgJCVjBFT85Msi-UXYkt5KQ8ZcHb6fzvA8mtRH7-hX0l8f1xMsXecfiYvU83maNSDjKeTD0W5bbAOX6LQyDRPar2Jpzg31Y5y9IwBfo7TkmpZbNGwcViuL7c7dOk0sa29H3Io-qLVN_XkNZwg_tVz3gP2wvtVBkmz-H-HRqYu8-JLTHlXNR3wZM_jcd8DttsIZO2CVe4K7GQadHKa6EfjYA',
    },
    {
      title: 'Beauty',
      subtitle: 'View Portraits',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg',
    },
  ];

  return (
    <section className="py-24 bg-background-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Portfolio</span>
          <h2 className="font-display text-4xl md:text-5xl font-medium text-text-light">
            Curated <span className="italic text-gray-400">Collections</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((collection, index) => (
            <div
              key={index}
              className="group relative h-[500px] overflow-hidden cursor-pointer"
            >
              <img
                alt={`${collection.title} collection`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                src={collection.imageUrl}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 border-[12px] border-transparent group-hover:border-white/10 transition-all duration-500">
                <h3 className="font-display text-5xl text-white font-medium mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  {collection.title}
                </h3>
                <div className="w-12 h-1 bg-primary mb-4 opacity-0 group-hover:opacity-100 transition-opacity delay-100 duration-500"></div>
                <p className="text-white text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity delay-200 duration-500">
                  {collection.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;
