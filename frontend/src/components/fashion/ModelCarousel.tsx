import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import type { FashionLook } from '../../hooks/useFashionCollection';

interface ModelCarouselProps {
    looks: FashionLook[];
    activeIndex: number;
    onActiveChange: (index: number) => void;
}

// How many upcoming models to preview behind (to the left of) the active one
const VISIBLE_AHEAD = 3;

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 28 };

/**
 * Layout: active model = rightmost & largest.
 * UPCOMING looks (higher index) appear to the LEFT, progressively smaller + blurred.
 * offset: 0 = active (rightmost), +1 = next look (one to the left), +2 = further left, etc.
 * Negative offset = already passed (hidden).
 */
function getModelTransform(offset: number, containerWidth: number) {
    const absOffset = Math.abs(offset);

    if (offset < 0 || absOffset > VISIBLE_AHEAD) {
        // Already-viewed looks (past) or too far ahead — hide
        return {
            scaleX: 0,
            scaleY: 0,
            opacity: 0,
            x: containerWidth + 100,
            blur: 14,
            zIndex: 0,
            display: false,
        };
    }

    // Vertical scale (height presence)
    const scaleYMap = [1, 0.86, 0.72, 0.62];
    const scaleY = scaleYMap[absOffset] ?? 0.58;

    // Horizontal stretch for upcoming previews so the blurred tail feels fuller.
    const scaleXMap = [1, 1.1, 1.24, 1.38];
    const scaleX = scaleXMap[absOffset] ?? 1.42;

    // Opacity
    const opacityMap = [1, 0.84, 0.58, 0.34];
    const opacity = opacityMap[absOffset] ?? 0.26;

    // Blur
    const blurMap = [0, 2.5, 5.5, 8.5];
    const blur = blurMap[absOffset] ?? 10.5;

    // Position: push trail further left so the last blurred preview fills the side space.
    const isMobileWidth = containerWidth < 640;
    const rightEdge = containerWidth * (isMobileWidth ? 0.48 : 0.69);
    const spacing = containerWidth * (isMobileWidth ? 0.22 : 0.255);
    const x = rightEdge - (absOffset * spacing);

    const zIndex = 10 - absOffset;

    return { scaleX, scaleY, opacity, x, blur, zIndex, display: true };
}

export default function ModelCarousel({ looks, activeIndex, onActiveChange }: ModelCarouselProps) {
    const [containerWidth, setContainerWidth] = useState(800);
    const [isDragging, setIsDragging] = useState(false);

    // Measure container
    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    const goNext = useCallback(() => {
        if (activeIndex < looks.length - 1) {
            onActiveChange(activeIndex + 1);
        }
    }, [activeIndex, looks.length, onActiveChange]);

    const goPrev = useCallback(() => {
        if (activeIndex > 0) {
            onActiveChange(activeIndex - 1);
        }
    }, [activeIndex, onActiveChange]);

    // Keyboard
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [goNext, goPrev]);

    // Drag/swipe — swipe RIGHT = next (pull upcoming from left), swipe LEFT = previous
    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const threshold = 50;
        if (info.offset.x > threshold) goNext();       // swipe right = advance
        else if (info.offset.x < -threshold) goPrev(); // swipe left = go back
    };

    if (looks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-lg italic">No looks available yet.</p>
            </div>
        );
    }

    // Render: active model + upcoming models that trail to the left
    const visibleLooks = looks.map((look, index) => ({
        look,
        index,
        offset: index - activeIndex, // 0 = active, +1 = next/left, +2 = further left
    })).filter(({ offset }) => offset >= 0 && offset <= VISIBLE_AHEAD);

    return (
        <div className="flex flex-col h-full">
            {/* Model viewport — takes full available height */}
            <motion.div
                ref={containerRef}
                className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                style={{ touchAction: 'pan-y' }}
            >
                <AnimatePresence mode="popLayout">
                    {visibleLooks.map(({ look, index, offset }) => {
                        const t = getModelTransform(offset, containerWidth);
                        if (!t.display) return null;

                        return (
                            <motion.div
                                key={look.id}
                                className="absolute bottom-0 origin-bottom-center"
                                initial={{ scaleX: 0.35, scaleY: 0.3, opacity: 0, x: containerWidth + 100 }}
                                animate={{
                                    scaleX: t.scaleX,
                                    scaleY: t.scaleY,
                                    opacity: t.opacity,
                                    x: t.x,
                                    filter: `blur(${t.blur}px)`,
                                    zIndex: t.zIndex,
                                }}
                                exit={{ scaleX: 0.35, scaleY: 0.3, opacity: 0, x: containerWidth + 200 }}
                                transition={SPRING}
                                onClick={() => {
                                    if (!isDragging && offset !== 0) onActiveChange(index);
                                }}
                                style={{
                                    willChange: 'transform, filter, opacity',
                                    cursor: offset !== 0 ? 'pointer' : 'default',
                                    transformOrigin: 'bottom center',
                                }}
                            >
                                <img
                                    src={look.model_image_url}
                                    alt={look.model_name || `Look ${look.look_number}`}
                                    className="h-full max-h-[calc(100vh-270px)] sm:max-h-[calc(100vh-220px)] w-auto max-w-none object-contain pointer-events-none select-none"
                                    draggable={false}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Bottom bar: look number + nav */}
            <div className="flex items-center justify-between py-3 px-1 flex-shrink-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-display tracking-[0.15em] text-gray-900 uppercase">
                        Look {String(looks[activeIndex]?.look_number ?? 0).padStart(2, '0')}
                    </h2>
                    {looks[activeIndex]?.model_name && (
                        <p className="text-[11px] text-gray-400 tracking-wide mt-0.5 uppercase">
                            {looks[activeIndex].model_name}
                        </p>
                    )}
                </div>

                {/* Dots + arrows */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={goPrev}
                        disabled={activeIndex === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous look"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <div className="flex gap-1.5 flex-row-reverse">
                        {looks.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => onActiveChange(idx)}
                                className={`rounded-full transition-all duration-300 ${idx === activeIndex
                                    ? 'bg-gray-800 w-5 h-1.5'
                                    : 'bg-gray-300 hover:bg-gray-400 w-1.5 h-1.5'
                                    }`}
                                aria-label={`Go to Look ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={goNext}
                        disabled={activeIndex === looks.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next look"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
