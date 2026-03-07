import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import LookProductSidebar from '../components/dressing-room/LookProductSidebar';
import { PageTransition } from '../components/PageTransition';
import { DRESSING_ROOM_DEMO } from '../mock/dressingRoomDemo';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 34 };

export default function DressingRoomLookPage() {
  const { lookNumber } = useParams<{ lookNumber: string }>();
  const lookNo = Number(lookNumber);

  const look = useMemo(() => {
    if (!Number.isFinite(lookNo)) return null;
    return DRESSING_ROOM_DEMO.looks.find((l) => l.lookNumber === lookNo) ?? null;
  }, [lookNo]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photos = look?.photos ?? [];
  const activePhoto = photos[activePhotoIndex] ?? null;

  const goNext = () => setActivePhotoIndex((i) => Math.min(photos.length - 1, i + 1));
  const goPrev = () => setActivePhotoIndex((i) => Math.max(0, i - 1));

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x > threshold) goPrev();
    else if (info.offset.x < -threshold) goNext();
  };

  if (!look) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] bg-[#f5f3f0] flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900">
              LOOK NOT FOUND
            </h1>
            <Link to="/dressing-room" className="inline-flex items-center justify-center px-5 py-3 border border-gray-400 bg-white hover:bg-gray-50 font-bold uppercase tracking-wider text-sm">
              Back to Summer Fits
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bg-[#f5f3f0] min-h-[calc(100vh-64px)] h-[calc(100dvh-64px)] overflow-hidden">
        <div className="h-full flex">
          <div className="flex-1 min-w-0 flex flex-col px-4 sm:px-6 lg:px-10 pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500 font-semibold">
                  Dressing Room
                </p>
                <h1 className="mt-1 text-4xl md:text-6xl font-black tracking-tight text-gray-900">
                  LOOK {look.lookNumber}
                </h1>
              </div>
              <Link
                to="/dressing-room"
                className="h-11 px-4 inline-flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold uppercase tracking-wider"
              >
                Back
              </Link>
            </div>

            <div className="flex-1 min-h-0 mt-4 relative">
              <motion.div
                className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={handleDragEnd}
                style={{ touchAction: 'pan-y' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {activePhoto && (
                      <motion.img
                        key={activePhotoIndex}
                        src={activePhoto}
                        alt={`Look ${look.lookNumber} photo ${activePhotoIndex + 1}`}
                        className="max-h-full w-auto max-w-none object-contain select-none pointer-events-none"
                        initial={{ opacity: 0, x: 24, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -24, scale: 0.98 }}
                        transition={SPRING}
                        draggable={false}
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = '/images/landing/neon.png';
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activePhotoIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 inline-flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-20"
                  aria-label="Previous photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activePhotoIndex === photos.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 inline-flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-20"
                  aria-label="Next photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </motion.div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500 italic">
                Swipe horizontally to browse photos
              </p>
              <div className="flex items-center gap-1.5">
                {photos.map((photo, idx) => (
                  <button
                    key={`photo-${photo}`}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className="h-10 w-8 inline-flex items-center justify-center"
                    aria-label={`Go to photo ${idx + 1}`}
                  >
                    <span
                      className={[
                        'rounded-full transition-all duration-300',
                        idx === activePhotoIndex ? 'bg-gray-900 w-5 h-1.5' : 'bg-gray-300 w-1.5 h-1.5',
                      ].join(' ')}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:block w-[220px] lg:w-[280px] xl:w-[320px] shrink-0 border-l border-gray-200/50 bg-[#f0eeeb]/60 h-full overflow-y-auto hide-scrollbar overscroll-contain">
            <LookProductSidebar items={[]} lookNumber={look.lookNumber} density="compact" />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
