import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { DEFAULT_NEWS_PAGE_SETTINGS, useNewsSettings } from '../hooks/useNewsSettings';
import { getCmsFontStyle } from '../lib/cmsTypography';

export default function News() {
  const { settings, isLoading } = useNewsSettings();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse flex items-center justify-center w-full h-96 bg-gray-50">
             <span className="text-gray-400 font-bold tracking-widest">LOADING...</span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const s = settings ?? DEFAULT_NEWS_PAGE_SETTINGS;
  const section1Fonts = s.section_fonts.section_1;
  const section2Fonts = s.section_fonts.section_2;
  const section3Fonts = s.section_fonts.section_3;

  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        <main className="max-w-5xl mx-auto px-6 lg:px-8 py-12 md:py-20 space-y-20 md:space-y-32">
          
          {/* Section 1 */}
          <section className="flex flex-col md:flex-row gap-8 md:gap-16 items-center">
            {/* Left Box */}
            <div className="w-full md:w-5/12 order-2 md:order-1">
              <div className="p-6 md:p-8 space-y-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {s.section_1_category}
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight uppercase" style={getCmsFontStyle(section1Fonts.heading)}>
                  {s.section_1_title}
                </h1>
                <p className="text-sm md:text-base font-bold text-gray-800 uppercase tracking-wide" style={getCmsFontStyle(section1Fonts.body)}>
                  {s.section_1_excerpt}
                </p>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-light" style={getCmsFontStyle(section1Fonts.body)}>
                  {s.section_1_description}
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 italic" style={getCmsFontStyle(section1Fonts.body)}>
                    {s.section_1_author}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right Image */}
            <div className="w-full md:w-7/12 order-1 md:order-2 relative">
              <div className="absolute top-4 -left-4 md:-left-6 bg-white border border-gray-200 px-3 py-1 text-xs font-bold rounded-full shadow-sm z-10 hidden md:block">
                01
              </div>
              <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-gray-100">
                {s.section_1_image ? (
                  <img src={s.section_1_image} alt="Feature 1" className="w-full h-full object-cover grayscale-[0.2]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
              </div>
              {/* Badge for mobile */}
              <div className="absolute top-4 left-4 bg-white border border-gray-200 px-3 py-1 text-xs font-bold rounded-full shadow-sm z-10 md:hidden">
                01
              </div>
            </div>
          </section>

          <hr className="border-t border-gray-200" />

          {/* Section 2 */}
          <section className="flex flex-col md:flex-row gap-8 md:gap-16 items-center">
             {/* Left Image */}
             <div className="w-full md:w-7/12 relative">
              <div className="absolute top-4 -right-4 md:-right-6 bg-white border border-gray-200 px-3 py-1 text-xs font-bold rounded-full shadow-sm z-10 hidden md:block">
                02
              </div>
              <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-gray-100">
                {s.section_2_image ? (
                  <img src={s.section_2_image} alt="Feature 2" className="w-full h-full object-cover grayscale-[0.2]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
              </div>
              {/* Badge for mobile */}
              <div className="absolute top-4 right-4 bg-white border border-gray-200 px-3 py-1 text-xs font-bold rounded-full shadow-sm z-10 md:hidden">
                02
              </div>
            </div>

            {/* Right Text */}
            <div className="w-full md:w-5/12 space-y-10 md:pl-8">
               <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-[1.2] uppercase whitespace-pre-line" style={getCmsFontStyle(section2Fonts.heading)}>
                  {s.section_2_title}
               </h2>
               
               <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500 font-medium tracking-widest" style={getCmsFontStyle(section2Fonts.body)}>
                  <span className="uppercase">{s.section_2_subtitle1}</span>
                  <span className="w-8 h-[1px] bg-gray-300"></span>
                  <span className="uppercase">{s.section_2_subtitle2}</span>
               </div>

               <p className="text-lg md:text-xl font-bold uppercase text-gray-900 leading-[1.6] tracking-wide whitespace-pre-line italic" style={getCmsFontStyle(section2Fonts.body)}>
                  {s.section_2_quotes}
               </p>
            </div>
          </section>

          <hr className="border-t border-gray-200" />

          {/* Section 3 */}
          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase" style={getCmsFontStyle(section3Fonts.heading)}>
                {s.section_3_title}
              </h2>
              <Link to="/shop" className="bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-[#ff4b86] transition-colors self-start md:self-auto shadow-md">
                SHOP HERE
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
              {s.section_3_products?.map((product, idx) => (
                <Link to={product.link || '/shop'} key={`prod-${idx}`} className="group block">
                  <div className="aspect-[4/5] bg-white mb-4 overflow-hidden border border-gray-200 flex items-center justify-center p-4 group-hover:border-[#ff4b86] group-hover:shadow-xl group-hover:shadow-pink-100 transition-all duration-300">
                     {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                     ) : (
                        <span className="material-symbols-outlined text-3xl text-gray-300">shopping_bag</span>
                     )}
                  </div>
                  <div className="space-y-1.5 px-1">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest" style={getCmsFontStyle(section3Fonts.body)}>{product.brand}</p>
                    <h3 className="text-xs font-bold text-gray-900 leading-tight uppercase min-h-[2rem] group-hover:text-[#ff4b86] transition-colors" style={getCmsFontStyle(section3Fonts.body)}>
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-gray-600 font-medium mt-1" style={getCmsFontStyle(section3Fonts.body)}>{product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>

        {/* Footer Bar */}
        <div className="bg-black text-white py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold tracking-widest uppercase gap-4 text-center md:text-left">
          <span>ALL THE RIGHTS RESERVED</span>
          <span>© 2023 CONDÉ NAST</span>
        </div>
      </div>
    </PageTransition>
  );
}
