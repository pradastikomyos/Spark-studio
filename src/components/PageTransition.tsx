import { LazyMotion, m } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition component provides smooth fade and slide animations for page transitions.
 * 
 * Features:
 * - Fade in/out with opacity transitions
 * - Slide animations (y: 20 → 0 → -20)
 * - 300ms duration with easeOut/easeIn timing
 * - Respects user's prefers-reduced-motion preference
 * - Works with AnimatePresence for route changes
 * 
 * Usage:
 * Wrap page components with PageTransition:
 * 
 * ```tsx
 * <AnimatePresence mode="wait">
 *   <Routes location={location} key={location.pathname}>
 *     <Route path="/shop" element={
 *       <PageTransition>
 *         <ShopPage />
 *       </PageTransition>
 *     } />
 *   </Routes>
 * </AnimatePresence>
 * ```
 * 
 * @param children - The page content to animate
 */
export function PageTransition({ children }: PageTransitionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user's motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes to the preference
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Animation variants for normal motion
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeIn'
      }
    }
  };

  // Reduced motion variants (no slide, faster fade)
  const reducedMotionVariants = {
    initial: {
      opacity: 0
    },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.15
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15
      }
    }
  };

  return (
    <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
      <m.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={prefersReducedMotion ? reducedMotionVariants : pageVariants}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
