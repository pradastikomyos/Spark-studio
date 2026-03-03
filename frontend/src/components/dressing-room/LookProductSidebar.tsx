import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { DressingRoomLookItem } from '../../hooks/useDressingRoomCollection';
import { Heart, Plus } from 'lucide-react';

interface LookProductSidebarProps {
    items: DressingRoomLookItem[];
    lookNumber: number;
    density?: 'compact' | 'comfortable';
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return '';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

export default function LookProductSidebar({ items, lookNumber, density = 'compact' }: LookProductSidebarProps) {
    const isComfortable = density === 'comfortable';

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 p-4 sm:p-6">
                <p className="text-[11px] sm:text-xs md:text-sm italic text-center">
                    No products linked to this look yet.
                </p>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={lookNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={[
                    isComfortable ? 'px-4 py-4 space-y-4' : 'px-2 sm:px-3 md:px-4 lg:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4 lg:space-y-5',
                ].join(' ')}
            >
                {items.map((item, idx) => {
                    const variant = item.product_variant;
                    if (!variant) return null;

                    const product = variant.product;
                    const displayName = item.label || variant.name;
                    const imageUrl = item.resolved_image_url;

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1, duration: 0.35 }}
                            className="bg-white rounded-sm overflow-hidden"
                        >
                            {/* === SINGLE CARD: heart, image, name, price, + all inside === */}

                            {/* Heart — top-left inside card */}
                            <div className={isComfortable ? 'flex justify-start px-3 pt-3' : 'flex justify-start px-2 sm:px-3 md:px-4 pt-2 sm:pt-3'}>
                                <button
                                    className="h-11 w-11 -ml-2 -mt-2 inline-flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                                    aria-label="Add to wishlist"
                                >
                                    <Heart className={isComfortable ? 'w-5 h-5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]'} strokeWidth={1.8} />
                                </button>
                            </div>

                            {/* Product image */}
                            <Link
                                to={product?.id ? `/shop/product/${product.id}` : '#'}
                                className="block"
                            >
                                <div className={isComfortable ? 'aspect-square overflow-hidden px-3 py-2' : 'aspect-square overflow-hidden px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2'}>
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={displayName}
                                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:hover:scale-100"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="w-14 h-14">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <path d="M21 15l-5-5L5 21" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </Link>

                            {/* Name */}
                            <div className={isComfortable ? 'px-3 pt-2.5' : 'px-2 sm:px-3 md:px-4 pt-1.5 sm:pt-2'}>
                                <p
                                    className={[
                                        isComfortable ? 'text-xs' : 'text-[9px] sm:text-[9.5px] md:text-[10px]',
                                        'font-medium uppercase tracking-[0.08em] text-gray-700 leading-snug',
                                    ].join(' ')}
                                >
                                    {displayName}
                                </p>
                            </div>

                            {/* Price + Add button — bottom row */}
                            <div className={isComfortable ? 'flex items-center justify-between px-3 pt-1.5 pb-3' : 'flex items-center justify-between px-2 sm:px-3 md:px-4 pt-1 pb-2 sm:pb-3'}>
                                {variant.price !== null ? (
                                    <p className={isComfortable ? 'text-xs text-gray-500' : 'text-[9px] sm:text-[9.5px] md:text-[10px] text-gray-400'}>
                                        {formatPrice(variant.price)}
                                    </p>
                                ) : <span />}

                                <button
                                    className="h-11 w-11 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                                    aria-label="Add to bag"
                                >
                                    <Plus className={isComfortable ? 'w-5 h-5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} strokeWidth={2} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </AnimatePresence>
    );
}
