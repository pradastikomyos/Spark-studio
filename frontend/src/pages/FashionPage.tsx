import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFashionCollection } from '../hooks/useFashionCollection';
import ModelCarousel from '../components/fashion/ModelCarousel';
import LookProductSidebar from '../components/fashion/LookProductSidebar';
import { PageTransition } from '../components/PageTransition';

export default function FashionPage() {
    const { collectionSlug } = useParams<{ collectionSlug?: string }>();
    const { collection, looks, isLoading, error } = useFashionCollection(collectionSlug);
    const [activeIndex, setActiveIndex] = useState(0);

    const activeLook = looks[activeIndex] ?? null;

    if (isLoading) {
        return (
            <PageTransition>
                <div className="h-[calc(100vh-64px)] bg-[#f5f3f0] flex items-center justify-center">
                    <div className="animate-pulse space-y-4 text-center">
                        <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
                        <div className="h-3 bg-gray-200 rounded w-72 mx-auto" />
                    </div>
                </div>
            </PageTransition>
        );
    }

    if (error) {
        return (
            <PageTransition>
                <div className="h-[calc(100vh-64px)] bg-[#f5f3f0] flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <p className="text-gray-500">Failed to load fashion collection.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-sm underline text-gray-700 hover:text-gray-900"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </PageTransition>
        );
    }

    if (!collection) {
        return (
            <PageTransition>
                <div className="h-[calc(100vh-64px)] bg-[#f5f3f0] flex items-center justify-center">
                    <div className="text-center space-y-4 px-4">
                        <h1 className="text-3xl md:text-5xl font-display tracking-wider text-gray-800">
                            COMING SOON
                        </h1>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Our fashion lookbook is being curated. Stay tuned for the latest collection.
                        </p>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            {/* Scrollable page — current season + next season */}
            <div className="bg-[#f5f3f0]">

                {/* ── SECTION 1: Current Season Lookbook ── */}
                <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 flex">
                        {/* LEFT: Title + Model Carousel */}
                        <div className="flex-1 min-w-0 flex flex-col px-6 lg:px-10 pt-5 pb-2">
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="flex-shrink-0 mb-2"
                            >
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-display italic tracking-wide text-gray-800">
                                    {collection.title}
                                </h1>
                                {collection.description && (
                                    <p className="mt-1 text-[11px] text-gray-400 max-w-sm leading-relaxed">
                                        {collection.description}
                                    </p>
                                )}
                            </motion.div>

                            {looks.length > 0 ? (
                                <div className="flex-1 min-h-0">
                                    <ModelCarousel
                                        looks={looks}
                                        activeIndex={activeIndex}
                                        onActiveChange={setActiveIndex}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    <p className="italic">No looks in this collection yet.</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Product sidebar */}
                        {looks.length > 0 && (
                            <div
                                className="hidden lg:block w-[280px] xl:w-[320px] border-l border-gray-200/50 bg-[#f0eeeb]/60 h-full overflow-y-auto"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <LookProductSidebar
                                    items={activeLook?.items ?? []}
                                    lookNumber={activeLook?.look_number ?? 0}
                                />
                            </div>
                        )}
                    </div>

                    {/* Mobile products */}
                    {looks.length > 0 && activeLook && activeLook.items.length > 0 && (
                        <div className="lg:hidden flex-shrink-0 border-t border-gray-200/60 bg-white/40 px-4 py-3">
                            <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                                {activeLook.items.map((item) => {
                                    const variant = item.product_variant;
                                    if (!variant) return null;
                                    return (
                                        <div key={item.id} className="flex-shrink-0 w-28">
                                            {item.resolved_image_url ? (
                                                <div className="aspect-square bg-gray-50 rounded overflow-hidden mb-1">
                                                    <img
                                                        src={item.resolved_image_url}
                                                        alt={item.label || variant.name}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="aspect-square bg-gray-100 rounded mb-1" />
                                            )}
                                            <p className="text-[9px] uppercase tracking-wide text-gray-600 truncate">
                                                {item.label || variant.name}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Scroll hint arrow */}
                    <div className="flex-shrink-0 flex justify-center pb-3">
                        <motion.div
                            animate={{ y: [0, 6, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                            className="text-gray-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </motion.div>
                    </div>
                </div>

                {/* ── SECTION 2: Next Season Teaser ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="min-h-[60vh] flex items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #f5f3f0 0%, #e8e4df 50%, #f5f3f0 100%)' }}
                >
                    {/* Decorative circles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-gray-200/30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-gray-200/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-gray-200/10" />
                    </div>

                    <div className="relative z-10 text-center px-6 space-y-6">
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-xs uppercase tracking-[0.3em] text-gray-400 font-semibold"
                        >
                            Next Season
                        </motion.p>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-3xl sm:text-4xl md:text-5xl font-display italic tracking-wide text-gray-700"
                        >
                            Stay Tuned!
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed"
                        >
                            Our next collection is being carefully crafted. Follow us for exclusive previews and early access.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                            className="pt-2"
                        >
                            <div className="inline-flex items-center gap-2 text-gray-400 text-xs tracking-widest uppercase">
                                <span className="w-8 h-px bg-gray-300"></span>
                                <span>Coming Soon</span>
                                <span className="w-8 h-px bg-gray-300"></span>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
