import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { FashionLookItem } from '../../hooks/useFashionCollection';
import { Heart, Plus } from 'lucide-react';

interface LookProductSidebarProps {
    items: FashionLookItem[];
    lookNumber: number;
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

export default function LookProductSidebar({ items, lookNumber }: LookProductSidebarProps) {
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 p-8">
                <p className="text-sm italic text-center">No products linked to this look yet.</p>
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
                className="px-5 py-4 space-y-5"
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
                            <div className="flex justify-start px-4 pt-3">
                                <button
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                    aria-label="Add to wishlist"
                                >
                                    <Heart className="w-[18px] h-[18px]" strokeWidth={1.8} />
                                </button>
                            </div>

                            {/* Product image */}
                            <Link
                                to={product?.id ? `/shop/product/${product.id}` : '#'}
                                className="block"
                            >
                                <div className="aspect-square overflow-hidden px-5 py-2">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={displayName}
                                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
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
                            <div className="px-4 pt-2">
                                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-700 leading-snug">
                                    {displayName}
                                </p>
                            </div>

                            {/* Price + Add button — bottom row */}
                            <div className="flex items-center justify-between px-4 pt-1 pb-3">
                                {variant.price !== null ? (
                                    <p className="text-[10px] text-gray-400">
                                        {formatPrice(variant.price)}
                                    </p>
                                ) : <span />}

                                <button
                                    className="text-gray-500 hover:text-gray-900 transition-colors"
                                    aria-label="Add to bag"
                                >
                                    <Plus className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </AnimatePresence>
    );
}
