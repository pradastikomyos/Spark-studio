import { useState } from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
  placeholder?: string;
}

const Shop = () => {
  const [activeCategory, setActiveCategory] = useState('All Products');

  const products: Product[] = [
    {
      id: 1,
      name: 'Cute Keychain',
      description: 'Adorable Design',
      price: 12.00,
      image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=800',
      badge: 'New Arrival',
    },
    {
      id: 2,
      name: 'Everyday Canvas Tote',
      description: 'Heavyweight Canvas',
      price: 32.00,
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
    },
    {
      id: 3,
      name: 'Minimalist Hoodie',
      description: 'French Terry, Classic White',
      price: 85.00,
      placeholder: 'checkroom',
    },
    {
      id: 4,
      name: 'Studio Cap',
      description: 'Embroidered Logo',
      price: 28.00,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA',
    },
    {
      id: 5,
      name: 'Weekend Tote',
      description: 'Large Capacity',
      price: 42.00,
      originalPrice: 55.00,
      placeholder: 'shopping_bag',
    },
    {
      id: 6,
      name: 'Gallery Print Tee',
      description: 'Limited Edition',
      price: 50.00,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA588h4jJ4oHsovcFrCVzPKpp_UEjMxSSaafs_xzNqq498XDUCQpkVffgJCVjBFT85Msi-UXYkt5KQ8ZcHb6fzvA8mtRH7-hX0l8f1xMsXecfiYvU83maNSDjKeTD0W5bbAOX6LQyDRPar2Jpzg31Y5y9IwBfo7TkmpZbNGwcViuL7c7dOk0sa29H3Io-qLVN_XkNZwg_tVz3gP2wvtVBkmz-H-HRqYu8-JLTHlXNR3wZM_jcd8DttsIZO2CVe4K7GQadHKa6EfjYA',
    },
  ];

  const categories = ['All Products', 'Apparel', 'Tote Bags', 'Prints', 'Accessories'];

  const features = [
    { icon: 'check', text: 'Premium Organic Materials' },
    { icon: 'check', text: 'Ethically Manufactured' },
    { icon: 'check', text: 'Designed in-house by Spark Artists' },
  ];

  return (
    <div className="bg-white dark:bg-background-dark min-h-screen">
      {/* Hero Header */}
      <header className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
        <img
          alt="Soft artistic studio setting"
          className="w-full h-full object-cover object-center opacity-90"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsDj0az3zzKzPuGWFNVkv93Z05vEWEttTgUqh4SS7iW-kLSNN2_0jvc-v4pho8kz2OqrqnpiQWh4vBzn87isw1yCP1VE1HXsHHOHubRuhCY6LmQpM3KdjfATKhPb2413xZu1naHDWVkwgWTK9sWUI-jwpMrYUO-6Uad1Qcq7NStqNGjpzbzTLH7nXSLD8e_CIiD6qurTg-eVxRwpK34LWyWrNCYPlMJqhFEbs2rUPPUn2uOz-B8JOZCi3FsjDK7b_ExLsUFMJyrA"
        />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-background-dark via-white/20 dark:via-background-dark/20 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium mb-4">
            Fall / Winter 2025
          </span>
          <h1 className="font-display text-5xl md:text-7xl text-text-light dark:text-text-dark font-medium mb-6">
            The Red Collection
          </h1>
          <p className="text-subtext-light dark:text-subtext-dark text-lg max-w-lg font-light mb-8">
            Curated apparel and accessories for the modern creative. Defined by bold lines and signature hues.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-gray-100 dark:border-gray-800 pb-6 sticky top-24 bg-white dark:bg-background-dark z-40 transition-all">
          <div className="flex space-x-8 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'font-medium text-primary border-b border-primary pb-0.5'
                    : 'font-light text-subtext-light dark:text-subtext-dark hover:text-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto justify-end">
            <span className="text-xs text-subtext-light dark:text-subtext-dark uppercase tracking-widest">
              Sort By:
            </span>
            <select className="text-sm font-light text-text-light dark:text-text-dark bg-transparent border-none focus:ring-0 cursor-pointer pr-8 py-0">
              <option>Featured</option>
              <option>Newest</option>
              <option>Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {products.map((product) => (
            <div key={product.id} className="group cursor-pointer">
              <div className="relative overflow-hidden aspect-[3/4] rounded-sm bg-gray-50 dark:bg-surface-dark mb-4">
                {product.image ? (
                  <img
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                      product.id === 6 ? 'grayscale hover:grayscale-0' : ''
                    }`}
                    src={product.image}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <span className="material-symbols-outlined text-6xl">{product.placeholder}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300"></div>
                <button className="absolute bottom-4 right-4 bg-primary text-white p-2 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-md hover:bg-black">
                  <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                </button>
                {product.badge && (
                  <span className="absolute top-4 left-4 bg-white text-primary px-2 py-1 text-[10px] uppercase tracking-widest font-bold shadow-sm">
                    {product.badge}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-display text-lg text-text-light dark:text-text-dark mb-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-subtext-light dark:text-subtext-dark mb-2">{product.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-subtext-light dark:text-subtext-dark line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="flex justify-center mt-20">
          <button className="px-8 py-3 border border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase rounded-sm font-medium">
            Load More Products
          </button>
        </div>
      </main>

      {/* Feature Section */}
      <section className="bg-gray-50 dark:bg-black py-24 my-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img
                alt="Model wearing spark studio apparel"
                className="rounded-sm shadow-xl w-full h-[500px] object-cover grayscale"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkJ5TljbcL9JErzdImZpHysbVXEAVI6KflXWpPCI9Bl6k0ajJt___aOnK4LFmj6UfRmrolcZFtgA2hqaWEw7N58b9DfHSOSSvzQz9Qld-YEePxFI-i7tFQnCs17and8i1b9mxb70Dn7WAaQT1HMG8AHXeq9Tdrb1XKGBLB5AWXu9lccyaLz9HSMeO-JT0eTAKii9eqrjAx64mn1XBl0YkrRe8yhzdMVdiBmy97UQzlQFjsQiLXmTMWruIXzBdZgT4D4oZq9cmXgfg"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="font-display text-4xl text-text-light dark:text-text-dark">
                Defined by <span className="italic text-primary">Details</span>.
              </h2>
              <p className="text-subtext-light dark:text-subtext-dark font-light leading-relaxed">
                Our apparel collection is designed to be lived in. Soft fabrics, relaxed cuts, and minimalist branding that speaks to the creative soul. Each piece is crafted with care, ensuring you look as good as you feel.
              </p>
              <ul className="space-y-4 mt-4">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary font-light">{feature.icon}</span>
                    <span className="text-sm font-light text-text-light dark:text-text-dark">{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-6">
                <a
                  className="text-sm font-medium uppercase tracking-widest border-b border-primary pb-1 hover:text-primary transition-colors"
                  href="#"
                >
                  Read Our Story
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <span className="material-symbols-outlined text-4xl text-primary mb-4 inline-block">mail</span>
        <h2 className="font-display text-3xl font-medium mb-3 text-text-light dark:text-text-dark">
          Join the Spark Club
        </h2>
        <p className="text-subtext-light dark:text-subtext-dark font-light mb-8">
          Receive early access to new drops, exclusive offers, and inspiration directly to your inbox.
        </p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <input
            className="flex-grow px-4 py-3 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-sm outline-none transition-all placeholder:font-light placeholder:text-gray-400 font-light text-text-light dark:text-text-dark"
            placeholder="Your email address"
            required
            type="email"
          />
          <button
            className="bg-primary hover:bg-black text-white px-8 py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20"
            type="submit"
          >
            Subscribe
          </button>
        </form>
      </section>
    </div>
  );
};

export default Shop;
