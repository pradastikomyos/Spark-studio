import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/cartStore';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
  placeholder?: string;
  categorySlug?: string | null;
  defaultVariantId?: number;
  defaultVariantName?: string;
}

const Shop = () => {
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productsResult, categoriesResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              `
              id,
              name,
              description,
              image_url,
              is_active,
              deleted_at,
              categories(name, slug),
              product_variants(id, name, online_price, offline_price, attributes, is_active, stock, reserved_stock)
            `
            )
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('categories')
            .select('name, slug, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;

        const categoryRows = (categoriesResult.data || []) as unknown as { name: string; slug: string }[];
        setCategories(categoryRows);

        const mapped: Product[] = (productsResult.data || []).map((row) => {
          const variants = ((row as unknown as { product_variants?: unknown[] }).product_variants || []) as {
            id: number;
            name: string;
            online_price: string | number | null;
            offline_price: string | number | null;
            attributes: Record<string, unknown> | null;
            is_active: boolean | null;
            stock: number | null;
            reserved_stock: number | null;
          }[];

          let priceMin = Number.POSITIVE_INFINITY;
          let image: string | undefined;
          let defaultVariantId: number | undefined;
          let defaultVariantName: string | undefined;
          let defaultVariantPrice = Number.POSITIVE_INFINITY;
          const productImage = (row as unknown as { image_url?: string | null }).image_url ?? null;
          if (productImage) image = productImage;

          for (const v of variants) {
            if (v.is_active === false) continue;
            const price = typeof v.online_price === 'number' ? v.online_price : Number(v.online_price ?? v.offline_price ?? 0);
            if (Number.isFinite(price)) priceMin = Math.min(priceMin, price);
            if (!image) {
              const maybeImage = typeof v.attributes?.image_url === 'string' ? v.attributes.image_url : null;
              if (maybeImage) image = maybeImage;
            }

            const available = (v.stock ?? 0) - (v.reserved_stock ?? 0);
            const isAvailable = available > 0;
            if (isAvailable && Number.isFinite(price) && price >= 0 && price < defaultVariantPrice) {
              defaultVariantPrice = price;
              defaultVariantId = Number(v.id);
              defaultVariantName = String(v.name);
            }
          }

          if (!Number.isFinite(priceMin)) priceMin = 0;

          const categorySlug = (row as unknown as { categories?: { slug: string } | null }).categories?.slug ?? null;

          return {
            id: Number((row as unknown as { id: number | string }).id),
            name: String((row as unknown as { name: string }).name),
            description: String((row as unknown as { description?: string | null }).description ?? ''),
            price: priceMin,
            image,
            placeholder: image ? undefined : 'inventory_2',
            categorySlug,
            defaultVariantId,
            defaultVariantName,
          };
        });

        setProducts(mapped);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load products';
        setError(message);
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.categorySlug === activeCategory);
  }, [products, activeCategory]);

  const features = [
    { icon: 'check', text: 'Premium Organic Materials' },
    { icon: 'check', text: 'Ethically Manufactured' },
    { icon: 'check', text: 'Designed in-house by Spark Artists' },
  ];

  const handleAddToCart = (product: Product) => {
    if (!product.defaultVariantId || !product.defaultVariantName) return;
    addItem(
      {
        productId: product.id,
        productName: product.name,
        productImageUrl: product.image,
        variantId: product.defaultVariantId,
        variantName: product.defaultVariantName,
        unitPrice: product.price,
      },
      1
    );
    setToast('Berhasil memasukkan ke keranjang');
  };

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
            <button
              key="all"
              onClick={() => setActiveCategory('all')}
              className={`text-sm whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? 'font-medium text-primary border-b border-primary pb-0.5'
                  : 'font-light text-subtext-light dark:text-subtext-dark hover:text-primary'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => setActiveCategory(category.slug)}
                className={`text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category.slug
                    ? 'font-medium text-primary border-b border-primary pb-0.5'
                    : 'font-light text-subtext-light dark:text-subtext-dark hover:text-primary'
                }`}
              >
                {category.name}
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
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading products...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/shop/product/${product.id}`} className="group cursor-pointer">
                <div className="relative overflow-hidden aspect-[3/4] rounded-sm bg-gray-50 dark:bg-surface-dark mb-4">
                  {product.image ? (
                    <img
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      src={product.image}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <span className="material-symbols-outlined text-6xl">{product.placeholder}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300"></div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={!product.defaultVariantId}
                    className="absolute bottom-4 right-4 bg-primary text-white p-2 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-md hover:bg-black disabled:opacity-50 disabled:hover:bg-primary disabled:cursor-not-allowed"
                  >
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
              </Link>
            ))}
          </div>
        )}

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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-black text-white px-5 py-3 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Shop;
