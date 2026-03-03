import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDressingRoomCollection } from '../hooks/useDressingRoomCollection';
import ModelCarousel from '../components/dressing-room/ModelCarousel';
import LookProductSidebar from '../components/dressing-room/LookProductSidebar';
import { PageTransition } from '../components/PageTransition';

export default function DressingRoomCollectionPage() {
    const { collectionSlug } = useParams<{ collectionSlug?: string }>();
    const { collection, looks, isLoading, error } = useDressingRoomCollection(collectionSlug);
    const [activeIndex, setActiveIndex] = useState(0);
    const [mobileProductsOpen, setMobileProductsOpen] = useState(false);

    const activeLook = looks[activeIndex] ?? null;

    useEffect(() => {
        setActiveIndex(0);
    }, [collection?.id]);

    useEffect(() => {
        setActiveIndex((current) => {
            if (looks.length === 0) return 0;
            return Math.min(Math.max(0, current), looks.length - 1);
        });
    }, [looks.length]);

    useEffect(() => {
        if (!mobileProductsOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileProductsOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileProductsOpen]);

    if (isLoading) {
        return (
            <PageTransition>
                <div className="min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] bg-[#f5f3f0] flex items-center justify-center">
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
                <div className="min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] bg-[#f5f3f0] flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <p className="text-gray-500">Failed to load dressing room collection.</p>
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
                <div className="min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] bg-[#f5f3f0] flex items-center justify-center">
                    <div className="text-center space-y-4 px-4">
                        <h1 className="text-3xl md:text-5xl font-display tracking-wider text-gray-800">
                            COMING SOON
                        </h1>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Our dressing room lookbook is being curated. Stay tuned for the latest collection.
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
                <div className="min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 flex">
                        {/* LEFT: Title + Model Carousel */}
                        <div className="flex-1 min-w-0 flex flex-col pl-3 pr-2 sm:px-4 md:px-6 lg:px-10 pt-4 md:pt-5 pb-2">
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
                                        productsCount={activeLook?.items?.length ?? 0}
                                        onOpenProducts={() => setMobileProductsOpen(true)}
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
                                className="hidden md:block w-[220px] lg:w-[280px] xl:w-[320px] shrink-0 border-l border-gray-200/50 bg-[#f0eeeb]/60 h-full overflow-y-auto hide-scrollbar overscroll-contain"
                            >
                                <LookProductSidebar
                                    items={activeLook?.items ?? []}
                                    lookNumber={activeLook?.look_number ?? 0}
                                    density="compact"
                                />
                            </div>
                        )}
                    </div>

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

                {/* Mobile products sheet */}
                <AnimatePresence>
                    {mobileProductsOpen && looks.length > 0 && (
                        <motion.div
                            className="fixed inset-0 z-[200] md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <button
                                type="button"
                                className="absolute inset-0 bg-black/35"
                                aria-label="Close products"
                                onClick={() => setMobileProductsOpen(false)}
                            />
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl bg-[#f0eeeb] shadow-2xl border-t border-black/5 overflow-hidden"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 40, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                            >
                                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-black/5">
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">
                                            Look {String(activeLook?.look_number ?? 0).padStart(2, '0')}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            Products
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-black/5"
                                        aria-label="Close"
                                        onClick={() => setMobileProductsOpen(false)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="overflow-y-auto hide-scrollbar overscroll-contain pb-[env(safe-area-inset-bottom)]">
                                    <LookProductSidebar
                                        items={activeLook?.items ?? []}
                                        lookNumber={activeLook?.look_number ?? 0}
                                        density="comfortable"
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
